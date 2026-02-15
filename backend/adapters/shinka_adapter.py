"""Adapter for ShinkaEvolve SQLite storage (read-only, WAL-safe)."""

from __future__ import annotations

import json
import logging
import math
import os
import sqlite3
import statistics
import time as _time
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from backend.adapters.base import FrameworkAdapter
from backend.models.unified import (
    AnalyticsSummary,
    ConversationEntry,
    CostTimeSeriesPoint,
    ExperimentStatus,
    Framework,
    IslandState,
    LineageNode,
    LineageTree,
    MetricsSummary,
    MigrationEvent,
    ModelPosteriorPoint,
    ModelUsageStats,
    TimeSeriesPoint,
    UnifiedExperiment,
    UnifiedProgram,
)

logger = logging.getLogger(__name__)


def _clean_nan(v):
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    return v


def _json_loads_safe(s, default=None):
    if not s:
        return default if default is not None else {}
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return default if default is not None else {}


def _db_retry(func):
    """Retry decorator for SQLite operations — mirrors ShinkaEvolve's pattern."""
    import functools

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        max_retries = 5
        delay = 0.1
        for i in range(max_retries):
            try:
                return func(*args, **kwargs)
            except (sqlite3.OperationalError, sqlite3.DatabaseError) as e:
                if i == max_retries - 1:
                    logger.error(f"DB op {func.__name__} failed after {max_retries} retries: {e}")
                    raise
                logger.debug(f"DB retry {i+1}/{max_retries} for {func.__name__}: {e}")
                _time.sleep(delay)
                delay *= 2
        raise RuntimeError("Should not reach here")
    return wrapper


class ShinkaAdapter(FrameworkAdapter):
    """Reads ShinkaEvolve SQLite databases (read-only)."""

    def __init__(self, experiment_path: str):
        super().__init__(experiment_path)
        self._db_path = experiment_path

    def _connect(self) -> sqlite3.Connection:
        """Open a read-only connection (WAL-safe, never holds it)."""
        db_uri = f"file:{self._db_path}?mode=ro"
        conn = sqlite3.connect(db_uri, uri=True, timeout=30.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA busy_timeout = 10000;")
        conn.execute("PRAGMA journal_mode = WAL;")
        return conn

    def _query(self, sql: str, params: tuple = ()) -> List[sqlite3.Row]:
        """Execute a query and return all rows, closing the connection immediately."""
        conn = self._connect()
        try:
            cur = conn.execute(sql, params)
            return cur.fetchall()
        finally:
            conn.close()

    def _query_one(self, sql: str, params: tuple = ()) -> Optional[sqlite3.Row]:
        conn = self._connect()
        try:
            cur = conn.execute(sql, params)
            return cur.fetchone()
        finally:
            conn.close()

    def _row_to_unified(self, row: sqlite3.Row) -> UnifiedProgram:
        pub_metrics = _json_loads_safe(row["public_metrics"])
        priv_metrics = _json_loads_safe(row["private_metrics"])
        all_metrics = {**pub_metrics, **priv_metrics}
        embedding_2d = _json_loads_safe(row["embedding_pca_2d"], [])
        embedding_3d = None
        if "embedding_pca_3d" in row.keys():
            embedding_3d = _json_loads_safe(row["embedding_pca_3d"], [])
            if not embedding_3d or len(embedding_3d) != 3:
                embedding_3d = None
        migration_hist = _json_loads_safe(row["migration_history"], [])
        archive_ids = _json_loads_safe(row["archive_inspiration_ids"], [])
        top_k_ids = _json_loads_safe(row["top_k_inspiration_ids"], [])
        meta = _json_loads_safe(row["metadata"])

        return UnifiedProgram(
            id=row["id"],
            code=row["code"],
            language=row["language"] or "python",
            parent_id=row["parent_id"],
            generation=row["generation"],
            island_id=row["island_idx"],
            timestamp=row["timestamp"],
            score=_clean_nan(row["combined_score"]) or 0.0,
            metrics=all_metrics,
            correct=bool(row["correct"]),
            complexity=_clean_nan(row["complexity"]) or 0.0,
            diversity=0.0,
            code_diff=row["code_diff"],
            text_feedback=row["text_feedback"] if "text_feedback" in row.keys() else None,
            embedding_2d=embedding_2d if embedding_2d else None,
            embedding_3d=embedding_3d,
            embedding_cluster_id=row["embedding_cluster_id"],
            children_count=row["children_count"],
            in_archive=False,  # will set below
            migration_history=migration_hist,
            inspiration_ids=archive_ids + top_k_ids,
            metadata=meta,
        )

    # ── public API ──────────────────────────────────────────────────

    @_db_retry
    def get_experiment_info(self) -> UnifiedExperiment:
        row = self._query_one("SELECT COUNT(*) as cnt FROM programs")
        total = row["cnt"] if row else 0

        row = self._query_one("SELECT MAX(combined_score) as best FROM programs")
        best = row["best"] if row and row["best"] is not None else 0.0

        row = self._query_one("SELECT MAX(generation) as g FROM programs")
        gen = row["g"] if row and row["g"] is not None else 0

        row = self._query_one("SELECT COUNT(DISTINCT island_idx) as n FROM programs WHERE island_idx IS NOT NULL")
        n_islands = row["n"] if row else 0

        # Check metadata store for iteration info
        last_iter = 0
        try:
            row = self._query_one("SELECT value FROM metadata_store WHERE key='last_iteration'")
            if row:
                last_iter = int(row["value"])
        except Exception:
            pass

        return UnifiedExperiment(
            id=self._make_id(),
            name=Path(self._db_path).stem,
            framework=Framework.SHINKAEVOLVE,
            path=self._db_path,
            status=self._infer_status(),
            last_modified=self.get_last_modified(),
            total_programs=total,
            best_score=_clean_nan(best) or 0.0,
            current_generation=gen,
            num_islands=n_islands,
            last_iteration=last_iter,
            config=self._load_config(),
        )

    @_db_retry
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
        where_clauses: List[str] = []
        params: List[Any] = []

        if island_id is not None:
            where_clauses.append("island_idx = ?")
            params.append(island_id)
        if generation_min is not None:
            where_clauses.append("generation >= ?")
            params.append(generation_min)
        if generation_max is not None:
            where_clauses.append("generation <= ?")
            params.append(generation_max)
        if score_min is not None:
            where_clauses.append("combined_score >= ?")
            params.append(score_min)
        if correct_only:
            where_clauses.append("correct = 1")

        where = "WHERE " + " AND ".join(where_clauses) if where_clauses else ""

        # Sort mapping
        sort_col_map = {
            "generation": "generation",
            "score": "combined_score",
            "timestamp": "timestamp",
            "complexity": "complexity",
            "island_id": "island_idx",
            "children_count": "children_count",
        }
        sort_col = sort_col_map.get(sort_by, "generation")
        direction = "DESC" if sort_desc else "ASC"
        offset = (page - 1) * page_size

        # Count
        count_row = self._query_one(f"SELECT COUNT(*) as cnt FROM programs {where}", tuple(params))
        total = count_row["cnt"] if count_row else 0

        # Fetch
        rows = self._query(
            f"SELECT * FROM programs {where} ORDER BY {sort_col} {direction} LIMIT ? OFFSET ?",
            tuple(params + [page_size, offset]),
        )

        # Get archive set
        archive_set = self._get_archive_set()

        programs = []
        for row in rows:
            p = self._row_to_unified(row)
            p.in_archive = p.id in archive_set
            if archive_only and not p.in_archive:
                continue
            programs.append(p)

        return programs, total

    @_db_retry
    def get_program(self, program_id: str) -> Optional[UnifiedProgram]:
        row = self._query_one("SELECT * FROM programs WHERE id = ?", (program_id,))
        if row is None:
            return None
        archive_set = self._get_archive_set()
        p = self._row_to_unified(row)
        p.in_archive = p.id in archive_set
        return p

    @_db_retry
    def get_all_programs_brief(self) -> List[Dict[str, Any]]:
        rows = self._query(
            "SELECT id, parent_id, generation, island_idx, combined_score, "
            "correct, children_count, complexity FROM programs"
        )
        archive_set = self._get_archive_set()
        return [
            {
                "id": r["id"],
                "parent_id": r["parent_id"],
                "generation": r["generation"],
                "island_id": r["island_idx"],
                "score": _clean_nan(r["combined_score"]) or 0.0,
                "correct": bool(r["correct"]),
                "in_archive": r["id"] in archive_set,
                "children_count": r["children_count"],
                "complexity": _clean_nan(r["complexity"]) or 0.0,
            }
            for r in rows
        ]

    @_db_retry
    def get_conversations(
        self,
        page: int = 1,
        page_size: int = 50,
        improvements_only: bool = False,
        island_id: Optional[int] = None,
    ) -> Tuple[List[ConversationEntry], int]:
        """ShinkaEvolve doesn't store prompts separately — build from program data."""
        where_parts: List[str] = []
        params: List[Any] = []

        if island_id is not None:
            where_parts.append("p.island_idx = ?")
            params.append(island_id)

        where = "WHERE " + " AND ".join(where_parts) if where_parts else ""

        rows = self._query(
            f"""SELECT p.id, p.parent_id, p.generation, p.island_idx, p.timestamp,
                       p.combined_score, p.code_diff, p.text_feedback,
                       parent.combined_score as parent_score
                FROM programs p
                LEFT JOIN programs parent ON p.parent_id = parent.id
                {where}
                ORDER BY p.timestamp DESC""",
            tuple(params),
        )

        entries = []
        for r in rows:
            parent_score = _clean_nan(r["parent_score"]) or 0.0
            child_score = _clean_nan(r["combined_score"]) or 0.0
            delta = child_score - parent_score

            if improvements_only and delta <= 0:
                continue

            entries.append(ConversationEntry(
                program_id=r["id"],
                parent_id=r["parent_id"],
                generation=r["generation"],
                island_id=r["island_idx"],
                timestamp=r["timestamp"],
                score=child_score,
                parent_score=parent_score,
                improvement_delta=delta,
                code_diff=r["code_diff"],
            ))

        total = len(entries)
        start = (page - 1) * page_size
        return entries[start:start + page_size], total

    @_db_retry
    def get_metrics(self) -> MetricsSummary:
        rows = self._query(
            "SELECT generation, combined_score, timestamp, island_idx, correct FROM programs"
        )
        if not rows:
            return MetricsSummary()

        scores = [_clean_nan(r["combined_score"]) or 0.0 for r in rows]
        timestamps = [r["timestamp"] for r in rows]
        generations = [r["generation"] for r in rows]

        time_min = min(timestamps)
        time_max = max(timestamps)
        elapsed = time_max - time_min

        # Best by generation
        gen_best: Dict[int, float] = {}
        gen_scores: Dict[int, List[float]] = {}
        island_gen_best: Dict[int, Dict[int, float]] = {}

        for r in rows:
            g = r["generation"]
            s = _clean_nan(r["combined_score"]) or 0.0
            gen_best[g] = max(gen_best.get(g, 0), s)
            gen_scores.setdefault(g, []).append(s)

            isl = r["island_idx"]
            if isl is not None:
                island_gen_best.setdefault(isl, {})[g] = max(
                    island_gen_best.get(isl, {}).get(g, 0), s
                )

        best_history = [
            TimeSeriesPoint(generation=g, value=v) for g, v in sorted(gen_best.items())
        ]
        running_max = 0.0
        for pt in best_history:
            running_max = max(running_max, pt.value)
            pt.value = running_max

        mean_history = [
            TimeSeriesPoint(generation=g, value=statistics.mean(ss))
            for g, ss in sorted(gen_scores.items())
        ]

        per_island = {
            isl: [TimeSeriesPoint(generation=g, value=v) for g, v in sorted(gb.items())]
            for isl, gb in island_gen_best.items()
        }

        ppm = len(rows) / (elapsed / 60) if elapsed > 0 else 0

        # Improvement rate
        improvements = sum(1 for r in rows if (_clean_nan(r["combined_score"]) or 0) > 0 and r["correct"])
        imp_rate = improvements / len(rows) if rows else 0

        return MetricsSummary(
            total_programs=len(rows),
            best_score=max(scores),
            mean_score=statistics.mean(scores),
            median_score=statistics.median(scores),
            current_generation=max(generations),
            programs_per_minute=ppm,
            improvement_rate=imp_rate,
            time_elapsed=elapsed,
            best_score_history=best_history,
            mean_score_history=mean_history,
            per_island_best=per_island,
            score_distribution=sorted(scores),
        )

    @_db_retry
    def get_islands(self) -> Tuple[List[IslandState], List[MigrationEvent]]:
        rows = self._query(
            """SELECT island_idx, COUNT(*) as cnt,
                      MAX(combined_score) as best,
                      MAX(generation) as gen
               FROM programs
               WHERE island_idx IS NOT NULL
               GROUP BY island_idx
               ORDER BY island_idx"""
        )

        islands = []
        for r in rows:
            # Find best program for this island
            best_row = self._query_one(
                "SELECT id FROM programs WHERE island_idx = ? ORDER BY combined_score DESC LIMIT 1",
                (r["island_idx"],),
            )
            islands.append(IslandState(
                island_id=r["island_idx"],
                program_count=r["cnt"],
                best_score=_clean_nan(r["best"]) or 0.0,
                best_program_id=best_row["id"] if best_row else None,
                current_generation=r["gen"],
            ))

        # Migration events from migration_history in programs
        migrations: List[MigrationEvent] = []
        mig_rows = self._query(
            "SELECT id, combined_score, migration_history FROM programs WHERE migration_history IS NOT NULL AND migration_history != '[]'"
        )
        for r in mig_rows:
            hist = _json_loads_safe(r["migration_history"], [])
            for event in hist:
                if isinstance(event, dict):
                    migrations.append(MigrationEvent(
                        timestamp=event.get("timestamp", 0),
                        program_id=r["id"],
                        from_island=event.get("from_island", 0),
                        to_island=event.get("to_island", 0),
                        score=_clean_nan(r["combined_score"]) or 0.0,
                    ))

        migrations.sort(key=lambda m: m.timestamp)
        return islands, migrations

    @_db_retry
    def get_lineage(self, program_id: Optional[str] = None) -> LineageTree:
        rows = self._query(
            "SELECT id, parent_id, generation, island_idx, combined_score, children_count FROM programs"
        )
        archive_set = self._get_archive_set()

        nodes: Dict[str, LineageNode] = {}
        for r in rows:
            nodes[r["id"]] = LineageNode(
                id=r["id"],
                parent_id=r["parent_id"],
                generation=r["generation"],
                island_id=r["island_idx"],
                score=_clean_nan(r["combined_score"]) or 0.0,
            )

        for nid, node in nodes.items():
            if node.parent_id and node.parent_id in nodes:
                nodes[node.parent_id].children.append(nid)

        root_ids = [nid for nid, n in nodes.items() if n.parent_id is None or n.parent_id not in nodes]

        # Golden path
        best_row = self._query_one("SELECT id FROM programs ORDER BY combined_score DESC LIMIT 1")
        best_path: List[str] = []
        if best_row:
            curr = best_row["id"]
            while curr and curr in nodes:
                best_path.append(curr)
                curr = nodes[curr].parent_id
            best_path.reverse()

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

    @_db_retry
    def search_code(self, query: str, max_results: int = 50) -> List[UnifiedProgram]:
        rows = self._query(
            "SELECT * FROM programs WHERE code LIKE ? LIMIT ?",
            (f"%{query}%", max_results),
        )
        archive_set = self._get_archive_set()
        return [
            self._set_archive(self._row_to_unified(r), archive_set)
            for r in rows
        ]

    def get_last_modified(self) -> float:
        if os.path.exists(self._db_path):
            return os.path.getmtime(self._db_path)
        return 0.0

    @_db_retry
    def get_analytics(self) -> AnalyticsSummary:
        rows = self._query(
            "SELECT id, generation, timestamp, combined_score, parent_id, metadata "
            "FROM programs ORDER BY timestamp"
        )
        if not rows:
            return AnalyticsSummary()

        # Build parent score lookup
        parent_scores: Dict[str, float] = {}
        for r in rows:
            parent_scores[r["id"]] = _clean_nan(r["combined_score"]) or 0.0

        total_api = 0.0
        total_embed = 0.0
        total_novelty = 0.0
        total_meta = 0.0

        # Per-generation cost accumulators
        gen_costs: Dict[int, Dict[str, float]] = {}
        # Per-model stats
        model_stats: Dict[str, Dict[str, Any]] = {}
        # Posteriors by generation
        gen_posteriors: Dict[int, Dict[str, float]] = {}
        # Patch type distribution
        patch_dist: Dict[str, int] = {}

        for r in rows:
            meta = _json_loads_safe(r["metadata"])
            gen = r["generation"]
            score = _clean_nan(r["combined_score"]) or 0.0

            # Costs
            api_cost = meta.get("api_costs", 0) or 0
            embed_cost = meta.get("embed_cost", 0) or 0
            novelty_cost = meta.get("novelty_cost", 0) or 0
            meta_cost = meta.get("meta_cost", 0) or 0

            total_api += api_cost
            total_embed += embed_cost
            total_novelty += novelty_cost
            total_meta += meta_cost

            gc = gen_costs.setdefault(gen, {"api": 0, "embed": 0, "novelty": 0, "meta": 0})
            gc["api"] += api_cost
            gc["embed"] += embed_cost
            gc["novelty"] += novelty_cost
            gc["meta"] += meta_cost

            # Model usage
            llm_result = meta.get("llm_result", {}) or {}
            model_name = llm_result.get("model_name") or meta.get("model_name")
            if model_name:
                ms = model_stats.setdefault(model_name, {
                    "uses": 0, "cost": 0.0, "improvements": 0, "deltas": [],
                })
                ms["uses"] += 1
                ms["cost"] += api_cost

                parent_id = r["parent_id"]
                if parent_id and parent_id in parent_scores:
                    delta = score - parent_scores[parent_id]
                    ms["deltas"].append(delta)
                    if delta > 0:
                        ms["improvements"] += 1

            # Model posteriors
            posteriors = llm_result.get("model_posteriors")
            if posteriors and isinstance(posteriors, dict):
                gen_posteriors[gen] = posteriors

            # Patch type
            patch_type = meta.get("patch_type")
            if patch_type:
                patch_dist[patch_type] = patch_dist.get(patch_type, 0) + 1

        # Build cost time series (cumulative)
        cum_cost = 0.0
        cost_series = []
        for gen in sorted(gen_costs.keys()):
            gc = gen_costs[gen]
            cum_cost += gc["api"] + gc["embed"] + gc["novelty"] + gc["meta"]
            cost_series.append(CostTimeSeriesPoint(
                generation=gen,
                cumulative_cost=cum_cost,
                api_cost=gc["api"],
                embed_cost=gc["embed"],
                novelty_cost=gc["novelty"],
                meta_cost=gc["meta"],
            ))

        # Build model usage list
        model_usage = []
        for name, ms in sorted(model_stats.items(), key=lambda x: -x[1]["uses"]):
            avg_delta = sum(ms["deltas"]) / len(ms["deltas"]) if ms["deltas"] else 0
            model_usage.append(ModelUsageStats(
                model_name=name,
                total_uses=ms["uses"],
                total_cost=ms["cost"],
                improvements=ms["improvements"],
                improvement_rate=ms["improvements"] / ms["uses"] if ms["uses"] else 0,
                avg_score_delta=avg_delta,
            ))

        # Build posteriors over time
        posteriors_series = [
            ModelPosteriorPoint(generation=gen, posteriors=p)
            for gen, p in sorted(gen_posteriors.items())
        ]

        total_cost = total_api + total_embed + total_novelty + total_meta

        return AnalyticsSummary(
            total_cost=total_cost,
            total_api_cost=total_api,
            total_embed_cost=total_embed,
            total_novelty_cost=total_novelty,
            total_meta_cost=total_meta,
            cost_time_series=cost_series,
            model_usage=model_usage,
            model_posteriors_over_time=posteriors_series,
            patch_type_distribution=patch_dist,
        )

    @_db_retry
    def get_embeddings(self, max_programs: int = 200) -> Dict[str, Any]:
        rows = self._query(
            "SELECT id, combined_score, generation, island_idx, embedding, embedding_cluster_id "
            "FROM programs WHERE embedding IS NOT NULL AND embedding != '[]' "
            "ORDER BY combined_score DESC LIMIT ?",
            (max_programs,),
        )
        if not rows:
            return {}

        embeddings = []
        program_ids = []
        scores_list = []
        generations = []
        islands = []
        cluster_ids = []

        for r in rows:
            emb = _json_loads_safe(r["embedding"], [])
            if not emb or not isinstance(emb, list) or len(emb) == 0:
                continue
            embeddings.append(emb)
            program_ids.append(r["id"])
            scores_list.append(_clean_nan(r["combined_score"]) or 0.0)
            generations.append(r["generation"])
            islands.append(r["island_idx"])
            cluster_ids.append(r["embedding_cluster_id"])

        if len(embeddings) < 2:
            return {}

        # Compute cosine similarity matrix
        try:
            import numpy as np

            mat = np.array(embeddings, dtype=np.float32)
            norms = np.linalg.norm(mat, axis=1, keepdims=True)
            norms = np.maximum(norms, 1e-10)
            normalized = mat / norms
            similarity = (normalized @ normalized.T).tolist()
        except ImportError:
            # Fallback without numpy — compute manually
            n = len(embeddings)
            similarity = [[0.0] * n for _ in range(n)]
            for i in range(n):
                for j in range(i, n):
                    dot = sum(a * b for a, b in zip(embeddings[i], embeddings[j]))
                    norm_i = sum(a * a for a in embeddings[i]) ** 0.5
                    norm_j = sum(a * a for a in embeddings[j]) ** 0.5
                    sim = dot / max(norm_i * norm_j, 1e-10)
                    similarity[i][j] = round(sim, 4)
                    similarity[j][i] = round(sim, 4)

        return {
            "program_ids": program_ids,
            "scores": scores_list,
            "generations": generations,
            "islands": islands,
            "similarity_matrix": similarity,
            "cluster_ids": cluster_ids,
        }

    # ── helpers ─────────────────────────────────────────────────────

    def _make_id(self) -> str:
        return "se_" + Path(self._db_path).stem.replace(" ", "_")

    def _infer_status(self) -> ExperimentStatus:
        from backend.config import STATUS_RUNNING_THRESHOLD, STATUS_PAUSED_THRESHOLD

        last_mod = self.get_last_modified()
        if last_mod == 0:
            return ExperimentStatus.UNKNOWN
        age = _time.time() - last_mod
        if age < STATUS_RUNNING_THRESHOLD:
            return ExperimentStatus.RUNNING
        if age < STATUS_PAUSED_THRESHOLD:
            return ExperimentStatus.PAUSED
        return ExperimentStatus.COMPLETED

    def _get_archive_set(self) -> set:
        try:
            rows = self._query("SELECT program_id FROM archive")
            return {r["program_id"] for r in rows}
        except Exception:
            return set()

    def _set_archive(self, prog: UnifiedProgram, archive_set: set) -> UnifiedProgram:
        prog.in_archive = prog.id in archive_set
        return prog

    def _load_config(self) -> Optional[Dict[str, Any]]:
        """Try to find config near the database file."""
        db_dir = os.path.dirname(self._db_path)
        candidates = [
            os.path.join(db_dir, "config.yaml"),
            os.path.join(db_dir, "config.yml"),
            os.path.join(db_dir, ".hydra", "config.yaml"),
            os.path.join(db_dir, ".hydra", "overrides.yaml"),
        ]
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

    def get_meta_files(self) -> List[Dict[str, Any]]:
        """List meta_N.txt files near the database."""
        db_dir = os.path.dirname(self._db_path)
        meta_files = []
        for f in sorted(os.listdir(db_dir)):
            if f.startswith("meta_") and f.endswith(".txt"):
                fpath = os.path.join(db_dir, f)
                try:
                    gen = int(f.replace("meta_", "").replace(".txt", ""))
                except ValueError:
                    gen = 0
                meta_files.append({
                    "filename": f,
                    "generation": gen,
                    "path": fpath,
                    "size": os.path.getsize(fpath),
                })
        return meta_files

    def get_meta_content(self, generation: int) -> Optional[str]:
        db_dir = os.path.dirname(self._db_path)
        path = os.path.join(db_dir, f"meta_{generation}.txt")
        if os.path.exists(path):
            with open(path) as f:
                return f.read()
        return None
