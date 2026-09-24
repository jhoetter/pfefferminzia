from __future__ import annotations

import subprocess

import pytest

from pfefferminzia import upstream


def test_missing_pinned_submodule_is_initialized_once(monkeypatch, tmp_path):
    manifest = tmp_path / "vendor" / "falk-pfefferminzia" / "data" / "manifest_S.json"
    monkeypatch.setattr(upstream, "ROOT", tmp_path)
    monkeypatch.setattr(upstream, "MANIFEST_PATH", manifest)
    calls = []

    def fake_run(command, **kwargs):
        calls.append((command, kwargs))
        manifest.parent.mkdir(parents=True)
        manifest.write_text("{}", encoding="utf-8")

    monkeypatch.setattr(upstream.subprocess, "run", fake_run)
    assert upstream.ensure_falk_submodule() is True
    assert upstream.ensure_falk_submodule() is False
    assert len(calls) == 1
    assert calls[0][0] == ["git", "submodule", "update", "--init", "--recursive", "--", "vendor/falk-pfefferminzia"]
    assert calls[0][1]["cwd"] == tmp_path


def test_submodule_download_failure_has_actionable_message(monkeypatch, tmp_path):
    monkeypatch.setattr(upstream, "ROOT", tmp_path)
    monkeypatch.setattr(upstream, "MANIFEST_PATH", tmp_path / "missing-manifest.json")

    def fail(command, **kwargs):
        raise subprocess.CalledProcessError(1, command)

    monkeypatch.setattr(upstream.subprocess, "run", fail)
    with pytest.raises(RuntimeError, match="uv run pfefferminzia setup"):
        upstream.ensure_falk_submodule()
