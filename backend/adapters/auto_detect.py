"""Auto-detect frameworks and discover experiments in the scan directory."""

from __future__ import annotations

import glob
import logging
import os
from pathlib import Path
from typing import List, Optional, Tuple

from backend.models.unified import Framework

logger = logging.getLogger(__name__)


def detect_framework(path: str) -> Optional[Framework]:
    """Detect which framework a given path belongs to.

    - SQLite/DB file → ShinkaEvolve
    - Directory with checkpoint_*/metadata.json → OpenEvolve
    """
    if os.path.isfile(path):
        ext = os.path.splitext(path)[1].lower()
        if ext in (".sqlite", ".db"):
            return Framework.SHINKAEVOLVE
        return None

    if os.path.isdir(path):
        # Check if it IS a checkpoint dir
        if os.path.basename(path).startswith("checkpoint_"):
            meta = os.path.join(path, "metadata.json")
            if os.path.exists(meta):
                return Framework.OPENEVOLVE

        # Check if it contains checkpoint dirs
        for entry in os.listdir(path):
            sub = os.path.join(path, entry)
            if os.path.isdir(sub) and entry.startswith("checkpoint_"):
                meta = os.path.join(sub, "metadata.json")
                if os.path.exists(meta):
                    return Framework.OPENEVOLVE

        # Recurse one level into checkpoints/
        checkpoints_dir = os.path.join(path, "checkpoints")
        if os.path.isdir(checkpoints_dir):
            for entry in os.listdir(checkpoints_dir):
                sub = os.path.join(checkpoints_dir, entry)
                if os.path.isdir(sub) and entry.startswith("checkpoint_"):
                    meta = os.path.join(sub, "metadata.json")
                    if os.path.exists(meta):
                        return Framework.OPENEVOLVE

    return None


def discover_experiments(base_dir: str) -> List[Tuple[str, Framework]]:
    """Scan base_dir for all experiment directories / SQLite files.

    Returns list of (path, framework) tuples.
    """
    results: List[Tuple[str, Framework]] = []
    seen_paths: set = set()

    # 1. Find all SQLite files → ShinkaEvolve
    for pattern in ["**/*.sqlite", "**/*.db"]:
        for db_path in glob.iglob(os.path.join(base_dir, pattern), recursive=True):
            real = os.path.realpath(db_path)
            if real not in seen_paths:
                seen_paths.add(real)
                results.append((db_path, Framework.SHINKAEVOLVE))
                logger.debug(f"Discovered ShinkaEvolve experiment: {db_path}")

    # 2. Find all checkpoint directories → OpenEvolve
    #    We want the *parent* of the checkpoints dir (the experiment output root)
    for meta_path in glob.iglob(
        os.path.join(base_dir, "**", "checkpoint_*", "metadata.json"), recursive=True
    ):
        checkpoint_dir = os.path.dirname(meta_path)
        # Walk up to the checkpoints/ container
        checkpoints_parent = os.path.dirname(checkpoint_dir)
        if os.path.basename(checkpoints_parent) == "checkpoints":
            experiment_root = os.path.dirname(checkpoints_parent)
        else:
            experiment_root = checkpoints_parent

        real = os.path.realpath(experiment_root)
        if real not in seen_paths:
            seen_paths.add(real)
            results.append((experiment_root, Framework.OPENEVOLVE))
            logger.debug(f"Discovered OpenEvolve experiment: {experiment_root}")

    return results
