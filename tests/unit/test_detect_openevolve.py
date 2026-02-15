"""Tests for configs/projects/openevolve.py — detection and path resolution."""

import json
import os

import pytest

from configs.projects.openevolve import _detect_openevolve, _resolve_openevolve_path


class TestDetectOpenEvolve:
    def test_detects_dir_with_checkpoint(self, tmp_path):
        """Directory containing checkpoint_N/ with metadata.json is detected."""
        cp = tmp_path / "checkpoint_0"
        cp.mkdir()
        (cp / "metadata.json").write_text("{}")
        assert _detect_openevolve(str(tmp_path)) is True

    def test_detects_dir_with_checkpoints_subdir(self, tmp_path):
        """Directory with checkpoints/checkpoint_N/metadata.json is detected."""
        cp = tmp_path / "checkpoints" / "checkpoint_1"
        cp.mkdir(parents=True)
        (cp / "metadata.json").write_text("{}")
        assert _detect_openevolve(str(tmp_path)) is True

    def test_detects_checkpoint_dir_itself(self, tmp_path):
        """A checkpoint_N/ directory containing metadata.json is detected."""
        cp = tmp_path / "checkpoint_5"
        cp.mkdir()
        (cp / "metadata.json").write_text("{}")
        assert _detect_openevolve(str(cp)) is True

    def test_rejects_file(self, tmp_path):
        """A regular file is rejected."""
        f = tmp_path / "somefile.txt"
        f.write_text("hello")
        assert _detect_openevolve(str(f)) is False

    def test_rejects_empty_dir(self, tmp_path):
        """An empty directory is rejected."""
        assert _detect_openevolve(str(tmp_path)) is False

    def test_rejects_nonexistent(self, tmp_path):
        """A nonexistent path is rejected."""
        assert _detect_openevolve(str(tmp_path / "nope")) is False

    def test_rejects_checkpoint_without_metadata(self, tmp_path):
        """A checkpoint_N/ dir without metadata.json is rejected."""
        cp = tmp_path / "checkpoint_0"
        cp.mkdir()
        assert _detect_openevolve(str(tmp_path)) is False

    def test_rejects_non_checkpoint_subdir(self, tmp_path):
        """Subdirectories not named checkpoint_N are ignored."""
        sub = tmp_path / "output_0"
        sub.mkdir()
        (sub / "metadata.json").write_text("{}")
        assert _detect_openevolve(str(tmp_path)) is False


class TestResolveOpenEvolvePath:
    def test_resolve_path_from_checkpoint(self, tmp_path):
        """Match like /base/exp/checkpoint_0/metadata.json → /base/exp."""
        match = str(tmp_path / "exp" / "checkpoint_0" / "metadata.json")
        result = _resolve_openevolve_path(match)
        assert result == str(tmp_path / "exp")

    def test_resolve_path_from_checkpoints_subdir(self, tmp_path):
        """Match like /base/exp/checkpoints/checkpoint_0/metadata.json → /base/exp."""
        match = str(tmp_path / "exp" / "checkpoints" / "checkpoint_0" / "metadata.json")
        result = _resolve_openevolve_path(match)
        assert result == str(tmp_path / "exp")

    def test_resolve_non_checkpoints_parent(self, tmp_path):
        """When parent of checkpoint dir is NOT 'checkpoints', go up one level."""
        match = str(tmp_path / "runs" / "checkpoint_3" / "metadata.json")
        result = _resolve_openevolve_path(match)
        assert result == str(tmp_path / "runs")
