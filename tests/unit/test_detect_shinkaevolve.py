"""Tests for configs/projects/shinkaevolve.py — detection logic."""

import os

import pytest

from configs.projects.shinkaevolve import _detect_shinkaevolve


class TestDetectShinkaEvolve:
    def test_detects_sqlite_file(self, tmp_path):
        f = tmp_path / "evolution.sqlite"
        f.write_bytes(b"")
        assert _detect_shinkaevolve(str(f)) is True

    def test_detects_db_file(self, tmp_path):
        f = tmp_path / "evolution.db"
        f.write_bytes(b"")
        assert _detect_shinkaevolve(str(f)) is True

    def test_case_insensitive_extension(self, tmp_path):
        """Extensions like .SQLite and .DB should also be detected."""
        f1 = tmp_path / "data.SQLite"
        f1.write_bytes(b"")
        assert _detect_shinkaevolve(str(f1)) is True

        f2 = tmp_path / "data.DB"
        f2.write_bytes(b"")
        assert _detect_shinkaevolve(str(f2)) is True

    def test_rejects_directory(self, tmp_path):
        d = tmp_path / "somedir.sqlite"
        d.mkdir()
        assert _detect_shinkaevolve(str(d)) is False

    def test_rejects_other_extension(self, tmp_path):
        f = tmp_path / "data.json"
        f.write_text("{}")
        assert _detect_shinkaevolve(str(f)) is False

    def test_rejects_nonexistent(self, tmp_path):
        assert _detect_shinkaevolve(str(tmp_path / "nope.sqlite")) is False

    def test_rejects_no_extension(self, tmp_path):
        f = tmp_path / "database"
        f.write_bytes(b"")
        assert _detect_shinkaevolve(str(f)) is False
