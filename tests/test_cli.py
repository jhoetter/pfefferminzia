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


def test_setup_reports_missing_inbox_settings_without_secrets(monkeypatch, capsys):
    monkeypatch.setattr(sys, "argv", ["pfefferminzia", "setup"])
    monkeypatch.setattr(cli, "_initialize", lambda: {"imported": True})
    monkeypatch.setattr(checkpoints, "checkpoint_profile", lambda: {"name": "drill-08-start"})
    from pfefferminzia import agentmail_service

    monkeypatch.setattr(agentmail_service, "agentmail_configuration", lambda probe=False: {
        "ready": False,
        "apiKeyConfigured": False,
        "inboxIdConfigured": False,
        "allowedRecipientCount": 0,
    })
    cli.main()
    output = capsys.readouterr().out
    assert '"agentMailConfigured": false' in output
    assert '"AGENTMAIL_API_KEY"' in output
    assert '"drill-08-start"' in output
