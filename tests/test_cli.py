from __future__ import annotations

import sys

import pytest

from pfefferminzia import checkpoints, cli


def test_checkpoint_verify_exits_nonzero_when_preflight_fails(monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["pfefferminzia", "checkpoint", "verify"])
    monkeypatch.setattr(cli, "_initialize", lambda: {})
    monkeypatch.setattr(checkpoints, "verify_checkpoint", lambda external: {"ok": False, "checks": []})

    with pytest.raises(SystemExit) as error:
        cli.main()

    assert error.value.code == 1
    assert '"ok": false' in capsys.readouterr().out
