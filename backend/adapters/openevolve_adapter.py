"""Adapter for OpenEvolve JSON-checkpoint storage (read-only)."""

from __future__ import annotations

import glob
import json
import logging
import math
import os
import statistics
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.adapters.base import FrameworkAdapter
from backend.models.unified import (
    ConversationEntry,
    ExperimentStatus,
    Framework,
    IslandState,
    LineageNode,
    LineageTree,
    MetricsSummary,
    MigrationEvent,
    TimeSeriesPoint,
    UnifiedExperiment,
    UnifiedProgram,
)

logger = logging.getLogger(__name__)


def _safe_json_float(v):
    """Return True if v is a finite number safe for JSON."""
    if not isinstance(v, (int, float)):
        return False
    if isinstance(v, bool):
        return False
    if math.isinf(v) or math.isnan(v):
        return False
    return True


def _safe_sum_metrics(metrics: Dict[str, Any]) -> float:
    vals = [v for v in metrics.values() if _safe_json_float(v)]
    return sum(vals) if vals else 0.0


def _sanitize_metrics(metrics: Dict[str, Any]) -> Dict[str, Any]:
    return {k: (v if _safe_json_float(v) else None) for k, v in metrics.items()}


class OpenEvolveAdapter(FrameworkAdapter):
    """Reads OpenEvolve checkpoint directories."""

    def __init__(self, experiment_path: str):
        super().__init__(experiment_path)
        self._checkpoint_dir: Optional[str] = None
        self._programs_cache: Optional[Dict[str, Dict]] = None
        self._metadata_cache: Optional[Dict] = None
        self._trace_cache: Optional[List[Dict]] = None
        self._cache_mtime: float = 0

    # ── internal helpers ────────────────────────────────────────────

    def _find_latest_checkpoint(self) -> Optional[str]:
        base = self.experiment_path
        # If path IS a checkpoint dir
        if os.path.basename(base).startswith("checkpoint_"):
            return base

        pattern = os.path.join(base, "**", "checkpoint_*")
        folders = glob.glob(pattern, recursive=True)
        folders = [f for f in folders if os.path.isdir(f)]
        if not folders:
            return None
        folders.sort(key=lambda x: os.path.getmtime(x), reverse=True)
        return folders[0]

    def _ensure_cache(self):
        cp = self._find_latest_checkpoint()
        if cp is None:
            self._programs_cache = {}
            self._metadata_cache = {}
            self._trace_cache = []
            return

        meta_path = os.path.join(cp, "metadata.json")
        mtime = os.path.getmtime(meta_path) if os.path.exists(meta_path) else 0
        if mtime == self._cache_mtime and self._programs_cache is not None:
            return

        self._checkpoint_dir = cp
        self._cache_mtime = mtime
        self._load_checkpoint(cp)

    def _load_checkpoint(self, cp: str):
        meta_path = os.path.join(cp, "metadata.json")
        programs_dir = os.path.join(cp, "programs")

        meta: Dict[str, Any] = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path) as f:
                    meta = json.load(f)
            except (json.JSONDecodeError, IOError):
                logger.warning(f"Failed to read metadata: {meta_path}")
        self._metadata_cache = meta

        programs: Dict[str, Dict] = {}
        if os.path.exists(programs_dir):
            for fname in os.listdir(programs_dir):
                if not fname.endswith(".json"):
                    continue
                fpath = os.path.join(programs_dir, fname)
                try:
                    with open(fpath) as f:
                        prog = json.load(f)
                    pid = prog.get("id", fname.replace(".json", ""))
                    programs[pid] = prog
                except (json.JSONDecodeError, IOError):
                    logger.debug(f"Skipping corrupt program file: {fpath}")

        # Assign island info from metadata
        for island_idx, id_list in enumerate(meta.get("islands", [])):
            for pid in id_list:
                if pid in programs:
                    programs[pid].setdefault("metadata", {})["island"] = island_idx

        self._programs_cache = programs

        # Load evolution trace
        self._trace_cache = self._load_traces()

    def _load_traces(self) -> List[Dict]:
        """Load evolution_trace.jsonl from various locations."""
        traces = []
        base = self.experiment_path
        candidates = [
            os.path.join(base, "evolution_trace.jsonl"),
            os.path.join(base, "traces", "evolution_trace.jsonl"),
        ]
        if self._checkpoint_dir:
            candidates.append(os.path.join(
                os.path.dirname(os.path.dirname(self._checkpoint_dir)),
                "evolution_trace.jsonl",
            ))

        for path in candidates:
            if os.path.exists(path):
                try:
                    with open(path) as f:
                        for line in f:
                            line = line.strip()
                            if line:
                                try:
                                    traces.append(json.loads(line))
                                except json.JSONDecodeError:
                                    continue
                except IOError:
                    continue
                break
        return traces

    def _prog_to_unified(self, prog: Dict, archive_set: set) -> UnifiedProgram:
        metrics_raw = prog.get("metrics", {})
        metrics = _sanitize_metrics(metrics_raw)
        score = _safe_sum_metrics(metrics_raw)
        meta = prog.get("metadata", {}) or {}

        # Extract prompts
        prompts_raw = prog.get("prompts")
        system_prompt = None
        user_prompt = None
        llm_response = None
        if isinstance(prompts_raw, dict):
            for key, val in prompts_raw.items():
                if isinstance(val, dict):
                    system_prompt = system_prompt or val.get("system")
                    user_prompt = user_prompt or val.get("user")
                    responses = val.get("responses", [])
                    if responses and isinstance(responses, list):
                        llm_response = llm_response or responses[0]

        # Artifacts
        artifacts = None
        arts_json = prog.get("artifacts_json")
        if arts_json:
            try:
                artifacts = json.loads(arts_json) if isinstance(arts_json, str) else arts_json
            except (json.JSONDecodeError, TypeError):
                artifacts = {"raw": str(arts_json)}

        pid = prog.get("id", "")
        return UnifiedProgram(
            id=pid,
            code=prog.get("code", ""),
            language=prog.get("language", "python"),
            parent_id=prog.get("parent_id"),
            generation=prog.get("generation", 0),
            island_id=meta.get("island"),
            timestamp=prog.get("timestamp", 0.0),
            iteration_found=prog.get("iteration_found", 0),
            score=score,
            metrics=metrics,
            correct=True,  # OpenEvolve doesn't track correctness separately
            complexity=prog.get("complexity", 0.0),
            diversity=prog.get("diversity", 0.0),
            code_diff=None,  # diffs are in traces
            changes_description=prog.get("changes_description", ""),
            prompts=prompts_raw,
            llm_response=llm_response,
            artifacts=artifacts,
            embedding_2d=None,
            children_count=0,  # computed below
            in_archive=pid in archive_set,
            migration_history=[],
            metadata=meta,
        )

    # ── public API ──────────────────────────────────────────────────

    def get_experiment_info(self) -> UnifiedExperiment:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        programs = self._programs_cache or {}

        best_id = meta.get("best_program_id")
        best_score = 0.0
        if best_id and best_id in programs:
            best_score = _safe_sum_metrics(programs[best_id].get("metrics", {}))

        return UnifiedExperiment(
            id=self._make_id(),
            name=Path(self.experiment_path).name,
            framework=Framework.OPENEVOLVE,
            path=self.experiment_path,
            status=self._infer_status(),
            last_modified=self.get_last_modified(),
            total_programs=len(programs),
            best_score=best_score,
            current_generation=max(
                (p.get("generation", 0) for p in programs.values()), default=0
            ),
            num_islands=len(meta.get("islands", [])),
            last_iteration=meta.get("last_iteration", 0),
            config=self._load_config(),
        )

    def get_programs(
        self,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "generation",
        sort_desc: bool = True,
        island_id: Optional[int] = None,
        generation_min: Optional[int] = None,
        generation_max: Optional[int] = None,
        score_min: Optional[float] = None,
        archive_only: bool = False,
        correct_only: bool = False,
    ) -> Tuple[List[UnifiedProgram], int]:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        archive_set = set(meta.get("archive", []))
        programs = self._programs_cache or {}

        # Convert all
        all_progs = [self._prog_to_unified(p, archive_set) for p in programs.values()]

        # Compute children counts
        parent_counts: Dict[str, int] = {}
        for p in all_progs:
            if p.parent_id:
                parent_counts[p.parent_id] = parent_counts.get(p.parent_id, 0) + 1
        for p in all_progs:
            p.children_count = parent_counts.get(p.id, 0)

        # Filter
        filtered = all_progs
        if island_id is not None:
            filtered = [p for p in filtered if p.island_id == island_id]
        if generation_min is not None:
            filtered = [p for p in filtered if p.generation >= generation_min]
        if generation_max is not None:
            filtered = [p for p in filtered if p.generation <= generation_max]
        if score_min is not None:
            filtered = [p for p in filtered if p.score >= score_min]
        if archive_only:
            filtered = [p for p in filtered if p.in_archive]

        # Sort
        sort_key_map = {
            "generation": lambda p: p.generation,
            "score": lambda p: p.score,
            "timestamp": lambda p: p.timestamp,
            "complexity": lambda p: p.complexity,
            "island_id": lambda p: p.island_id or 0,
            "children_count": lambda p: p.children_count,
        }
        key_fn = sort_key_map.get(sort_by, lambda p: p.generation)
        filtered.sort(key=key_fn, reverse=sort_desc)

        total = len(filtered)
        start = (page - 1) * page_size
        end = start + page_size
        return filtered[start:end], total

    def get_program(self, program_id: str) -> Optional[UnifiedProgram]:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        archive_set = set(meta.get("archive", []))
        programs = self._programs_cache or {}

        prog = programs.get(program_id)
        if prog is None:
            return None

        unified = self._prog_to_unified(prog, archive_set)

        # Attach diff from traces
        for trace in (self._trace_cache or []):
            if trace.get("child_id") == program_id:
                unified.code_diff = trace.get("code_diff")
                break

        return unified

    def get_all_programs_brief(self) -> List[Dict[str, Any]]:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        programs = self._programs_cache or {}
        archive_set = set(meta.get("archive", []))

        result = []
        for pid, prog in programs.items():
            pm = prog.get("metadata", {}) or {}
            result.append({
                "id": pid,
                "parent_id": prog.get("parent_id"),
                "generation": prog.get("generation", 0),
                "island_id": pm.get("island"),
                "score": _safe_sum_metrics(prog.get("metrics", {})),
                "in_archive": pid in archive_set,
                "changes_description": prog.get("changes_description", ""),
            })
        return result

    def get_conversations(
        self,
        page: int = 1,
        page_size: int = 50,
        improvements_only: bool = False,
        island_id: Optional[int] = None,
    ) -> Tuple[List[ConversationEntry], int]:
        self._ensure_cache()
        traces = self._trace_cache or []
        programs = self._programs_cache or {}

        entries: List[ConversationEntry] = []
        for t in traces:
            child_id = t.get("child_id", "")
            parent_id = t.get("parent_id", "")
            child_prog = programs.get(child_id, {})
            parent_prog = programs.get(parent_id, {})

            child_score = _safe_sum_metrics(t.get("child_metrics", {}))
            parent_score = _safe_sum_metrics(t.get("parent_metrics", {}))
            delta = child_score - parent_score

            prompt_data = t.get("prompt", {}) or {}
            entry = ConversationEntry(
                program_id=child_id,
                parent_id=parent_id,
                iteration=t.get("iteration", 0),
                generation=t.get("generation", 0),
                island_id=t.get("island_id"),
                timestamp=t.get("timestamp", 0.0),
                system_prompt=prompt_data.get("system"),
                user_prompt=prompt_data.get("user"),
                llm_response=t.get("llm_response"),
                score=child_score,
                parent_score=parent_score,
                improvement_delta=delta,
                mutation_type=t.get("metadata", {}).get("mutation_type", "diff") if t.get("metadata") else "diff",
                code_diff=t.get("code_diff"),
            )
            entries.append(entry)

        # Also build conversations from program prompts if no traces
        if not entries:
            meta = self._metadata_cache or {}
            archive_set = set(meta.get("archive", []))
            for pid, prog in programs.items():
                prompts_raw = prog.get("prompts")
                if not isinstance(prompts_raw, dict):
                    continue
                pm = prog.get("metadata", {}) or {}
                parent_metrics = pm.get("parent_metrics", {})
                parent_score = _safe_sum_metrics(parent_metrics) if parent_metrics else 0.0
                child_score = _safe_sum_metrics(prog.get("metrics", {}))

                for key, val in prompts_raw.items():
                    if not isinstance(val, dict):
                        continue
                    responses = val.get("responses", [])
                    entry = ConversationEntry(
                        program_id=pid,
                        parent_id=prog.get("parent_id"),
                        iteration=prog.get("iteration_found", 0),
                        generation=prog.get("generation", 0),
                        island_id=pm.get("island"),
                        timestamp=prog.get("timestamp", 0.0),
                        system_prompt=val.get("system"),
                        user_prompt=val.get("user"),
                        llm_response=responses[0] if responses else None,
                        score=child_score,
                        parent_score=parent_score,
                        improvement_delta=child_score - parent_score,
                        mutation_type=key,
                    )
                    entries.append(entry)

        # Filter
        if improvements_only:
            entries = [e for e in entries if e.improvement_delta > 0]
        if island_id is not None:
            entries = [e for e in entries if e.island_id == island_id]

        entries.sort(key=lambda e: e.timestamp, reverse=True)
        total = len(entries)
        start = (page - 1) * page_size
        return entries[start:start + page_size], total

    def get_metrics(self) -> MetricsSummary:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        programs = self._programs_cache or {}

        if not programs:
            return MetricsSummary()

        scores = [_safe_sum_metrics(p.get("metrics", {})) for p in programs.values()]
        timestamps = [p.get("timestamp", 0) for p in programs.values()]
        generations = [p.get("generation", 0) for p in programs.values()]

        best_score = max(scores) if scores else 0.0
        mean_score = statistics.mean(scores) if scores else 0.0
        median_score = statistics.median(scores) if scores else 0.0

        time_min = min(timestamps) if timestamps else 0
        time_max = max(timestamps) if timestamps else 0
        elapsed = time_max - time_min if time_min else 0

        ppm = len(programs) / (elapsed / 60) if elapsed > 0 else 0

        # Best score by generation
        gen_best: Dict[int, float] = {}
        gen_scores: Dict[int, List[float]] = {}
        for p in programs.values():
            g = p.get("generation", 0)
            s = _safe_sum_metrics(p.get("metrics", {}))
            gen_best[g] = max(gen_best.get(g, 0), s)
            gen_scores.setdefault(g, []).append(s)

        best_history = [
            TimeSeriesPoint(generation=g, value=v) for g, v in sorted(gen_best.items())
        ]
        # Running max
        running_max = 0.0
        for pt in best_history:
            running_max = max(running_max, pt.value)
            pt.value = running_max

        mean_history = [
            TimeSeriesPoint(generation=g, value=statistics.mean(ss))
            for g, ss in sorted(gen_scores.items())
        ]

        # Per-island best
        island_best: Dict[int, Dict[int, float]] = {}
        for p in programs.values():
            isl = (p.get("metadata") or {}).get("island")
            if isl is None:
                continue
            g = p.get("generation", 0)
            s = _safe_sum_metrics(p.get("metrics", {}))
            island_best.setdefault(isl, {})[g] = max(island_best.get(isl, {}).get(g, 0), s)

        per_island = {
            isl: [TimeSeriesPoint(generation=g, value=v) for g, v in sorted(gb.items())]
            for isl, gb in island_best.items()
        }

        # MAP-Elites grid from metadata
        feature_maps = meta.get("island_feature_maps", [])
        map_grid = None
        if feature_maps:
            cells = {}
            for fm in feature_maps:
                for coord_key, pid in fm.items():
                    prog = programs.get(pid)
                    if prog:
                        cells[coord_key] = {
                            "program_id": pid,
                            "score": _safe_sum_metrics(prog.get("metrics", {})),
                        }
            feature_stats = meta.get("feature_stats", {})
            map_grid = {"cells": cells, "feature_stats": feature_stats}

        improvements = sum(1 for t in (self._trace_cache or []) if _safe_sum_metrics(t.get("child_metrics", {})) > _safe_sum_metrics(t.get("parent_metrics", {})))
        total_traces = len(self._trace_cache or [])
        imp_rate = improvements / total_traces if total_traces else 0

        return MetricsSummary(
            total_programs=len(programs),
            best_score=best_score,
            mean_score=mean_score,
            median_score=median_score,
            current_generation=max(generations) if generations else 0,
            programs_per_minute=ppm,
            improvement_rate=imp_rate,
            time_elapsed=elapsed,
            best_score_history=best_history,
            mean_score_history=mean_history,
            per_island_best=per_island,
            score_distribution=sorted(scores),
            map_elites_grid=map_grid,
            total_llm_calls=total_traces,
        )

    def get_islands(self) -> Tuple[List[IslandState], List[MigrationEvent]]:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        programs = self._programs_cache or {}

        islands: List[IslandState] = []
        for idx, id_list in enumerate(meta.get("islands", [])):
            best_score = 0.0
            best_pid = None
            for pid in id_list:
                if pid in programs:
                    s = _safe_sum_metrics(programs[pid].get("metrics", {}))
                    if s > best_score:
                        best_score = s
                        best_pid = pid

            gen = (meta.get("island_generations") or [0] * (idx + 1))
            curr_gen = gen[idx] if idx < len(gen) else 0

            islands.append(IslandState(
                island_id=idx,
                program_count=len(id_list),
                best_score=best_score,
                best_program_id=best_pid,
                current_generation=curr_gen,
                program_ids=id_list,
            ))

        # No explicit migration events stored in OpenEvolve checkpoints
        migrations: List[MigrationEvent] = []
        return islands, migrations

    def get_lineage(self, program_id: Optional[str] = None) -> LineageTree:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        programs = self._programs_cache or {}
        archive_set = set(meta.get("archive", []))

        nodes: Dict[str, LineageNode] = {}
        for pid, prog in programs.items():
            pm = prog.get("metadata", {}) or {}
            nodes[pid] = LineageNode(
                id=pid,
                parent_id=prog.get("parent_id"),
                generation=prog.get("generation", 0),
                island_id=pm.get("island"),
                score=_safe_sum_metrics(prog.get("metrics", {})),
                changes_description=prog.get("changes_description", ""),
            )

        # Build children lists
        for pid, node in nodes.items():
            if node.parent_id and node.parent_id in nodes:
                nodes[node.parent_id].children.append(pid)

        root_ids = [pid for pid, n in nodes.items() if n.parent_id is None or n.parent_id not in nodes]

        # Golden path
        best_pid = meta.get("best_program_id")
        best_path: List[str] = []
        if best_pid and best_pid in nodes:
            curr = best_pid
            while curr and curr in nodes:
                best_path.append(curr)
                curr = nodes[curr].parent_id
            best_path.reverse()

        # If rooted at specific program, filter to subtree
        if program_id and program_id in nodes:
            subtree_ids = set()
            stack = [program_id]
            while stack:
                nid = stack.pop()
                subtree_ids.add(nid)
                if nid in nodes:
                    stack.extend(nodes[nid].children)
            nodes = {k: v for k, v in nodes.items() if k in subtree_ids}
            root_ids = [program_id]

        return LineageTree(nodes=nodes, root_ids=root_ids, best_path=best_path)

    def search_code(self, query: str, max_results: int = 50) -> List[UnifiedProgram]:
        self._ensure_cache()
        meta = self._metadata_cache or {}
        archive_set = set(meta.get("archive", []))
        programs = self._programs_cache or {}
        query_lower = query.lower()

        results = []
        for pid, prog in programs.items():
            code = prog.get("code", "")
            if query_lower in code.lower():
                results.append(self._prog_to_unified(prog, archive_set))
                if len(results) >= max_results:
                    break
        return results

    def get_last_modified(self) -> float:
        cp = self._find_latest_checkpoint()
        if cp:
            meta_path = os.path.join(cp, "metadata.json")
            if os.path.exists(meta_path):
                return os.path.getmtime(meta_path)
        return 0.0

    # ── helpers ─────────────────────────────────────────────────────

    def _make_id(self) -> str:
        return "oe_" + Path(self.experiment_path).name.replace(" ", "_")

    def _infer_status(self) -> ExperimentStatus:
        import time
        from backend.config import STATUS_RUNNING_THRESHOLD, STATUS_PAUSED_THRESHOLD

        last_mod = self.get_last_modified()
        if last_mod == 0:
            return ExperimentStatus.UNKNOWN
        age = time.time() - last_mod
        if age < STATUS_RUNNING_THRESHOLD:
            return ExperimentStatus.RUNNING
        if age < STATUS_PAUSED_THRESHOLD:
            return ExperimentStatus.PAUSED
        return ExperimentStatus.COMPLETED

    def _load_config(self) -> Optional[Dict[str, Any]]:
        """Try to find and load the experiment config."""
        candidates = [
            os.path.join(self.experiment_path, "config.yaml"),
            os.path.join(self.experiment_path, "config.yml"),
        ]
        if self._checkpoint_dir:
            candidates.append(os.path.join(
                os.path.dirname(os.path.dirname(self._checkpoint_dir)), "config.yaml"
            ))

        for path in candidates:
            if os.path.exists(path):
                try:
                    import yaml
                    with open(path) as f:
                        return yaml.safe_load(f)
                except Exception:
                    try:
                        with open(path) as f:
                            return {"raw": f.read()}
                    except IOError:
                        pass
        return None
