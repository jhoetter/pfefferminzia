from __future__ import annotations

from pfefferminzia import runtime_config


def test_agentmail_settings_hot_reload_without_checkpoint_or_auto_send(monkeypatch, tmp_path):
    env_path = tmp_path / ".env"
    monkeypatch.setattr(runtime_config, "ENV_PATH", env_path)
    monkeypatch.setattr(runtime_config, "_last_signature", None)
    monkeypatch.setattr(runtime_config, "_last_file_keys", set())
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "")
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-06-start")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")

    assert runtime_config.reload_agentmail_environment_if_changed() is False
    env_path.write_text(
        "AGENTMAIL_API_KEY=inbox-scoped-test-key\n"
        "AGENTMAIL_INBOX_ID=participant@agentmail.to\n"
        "WORKSHOP_ALLOWED_RECIPIENTS=instructor@agentmail.to\n"
        "WORKSHOP_CHECKPOINT=drill-09-start\nAUTO_SEND_ENABLED=true\n",
        encoding="utf-8",
    )
    assert runtime_config.reload_agentmail_environment_if_changed() is True
    assert runtime_config.reload_agentmail_environment_if_changed() is False
    assert runtime_config.os.getenv("AGENTMAIL_INBOX_ID") == "participant@agentmail.to"
    assert runtime_config.os.getenv("WORKSHOP_CHECKPOINT") == "drill-06-start"
    assert runtime_config.os.getenv("AUTO_SEND_ENABLED") == "false"

    env_path.write_text("AGENTMAIL_INBOX_ID=other@agentmail.to\n", encoding="utf-8")
    assert runtime_config.reload_agentmail_environment_if_changed() is True
    assert runtime_config.os.getenv("AGENTMAIL_API_KEY") is None
    assert runtime_config.os.getenv("AGENTMAIL_INBOX_ID") == "other@agentmail.to"


def test_env_file_wins_over_inherited_empty_variables(monkeypatch, tmp_path):
    """A second Claude session may start the MCP server with empty AGENTMAIL_* variables."""
    env_path = tmp_path / ".env"
    env_path.write_text("AGENTMAIL_API_KEY=key\nAGENTMAIL_INBOX_ID=p@agentmail.to\nWORKSHOP_ALLOWED_RECIPIENTS=d@agentmail.to\n")
    monkeypatch.setattr(runtime_config, "ENV_PATH", env_path)
    monkeypatch.setattr(runtime_config, "_last_signature", None)
    monkeypatch.setattr(runtime_config, "_last_file_keys", set())
    for name in runtime_config.AGENTMAIL_SETTINGS:
        monkeypatch.setenv(name, "")
    from pfefferminzia.agentmail_service import agentmail_configuration

    assert agentmail_configuration()["ready"] is True
