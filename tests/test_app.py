from fastapi.testclient import TestClient

from pfefferminzia.database import close_database


def test_python_host_serves_api_and_browser_workspace(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "pfefferminzia.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setenv("WORKSHOP_PROFILE", "participant")
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    close_database()

    from pfefferminzia.app import create_app

    app = create_app()

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"ok": True, "service": "pfefferminzia"}
        dashboard = client.get("/api/dashboard")
        assert dashboard.status_code == 200
        assert dashboard.json()["tickets"] == []
        assert dashboard.json()["workshop"]["checkpoint"]["name"] == "drill-08-start"
        page = client.get("/")
        assert page.status_code == 200
        assert '<div id="app" aria-live="polite"></div>' in page.text
        assert '/workshop.js' in page.text
        assert '/assets/' not in page.text
        assert client.get("/workshop.js").headers["content-type"].startswith("text/javascript")
        assert client.get("/workshop.css").headers["content-type"].startswith("text/css")
        assert 'Die Versicherungs-Werkstatt' in client.get("/workshop.js").text
        assert '<div class="dialog-backdrop">' in client.get("/workshop.js").text
        assert 'data-action="cancel"><div class="dialog"' not in client.get("/workshop.js").text
        assert client.get("/logo.svg").headers["content-type"].startswith("image/svg+xml")

    close_database()


def test_partial_agentmail_configuration_keeps_app_available(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "partial-agentmail.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "configured-but-incomplete")
    monkeypatch.delenv("AGENTMAIL_INBOX_ID", raising=False)
    monkeypatch.delenv("WORKSHOP_ALLOWED_RECIPIENTS", raising=False)
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    close_database()

    from pfefferminzia.app import create_app

    with TestClient(create_app()) as client:
        assert client.get("/api/health").status_code == 200
        assert client.get("/api/dashboard").json()["workshop"]["agentMail"]["ready"] is False
        response = client.post("/api/sync")
        assert response.status_code == 400
        assert "AGENTMAIL_INBOX_ID" in response.json()["error"]
    close_database()


def test_agentmail_config_becomes_visible_without_restart(monkeypatch, tmp_path):
    from pfefferminzia import runtime_config
    from pfefferminzia.app import create_app

    env_path = tmp_path / ".env"
    monkeypatch.setattr(runtime_config, "ENV_PATH", env_path)
    monkeypatch.setattr(runtime_config, "_last_signature", None)
    monkeypatch.setattr(runtime_config, "_last_file_keys", set())
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "hot-reload.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AGENTMAIL_INBOX_ID", "")
    monkeypatch.setenv("WORKSHOP_ALLOWED_RECIPIENTS", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    close_database()

    with TestClient(create_app()) as client:
        assert client.get("/api/dashboard").json()["workshop"]["agentMail"]["ready"] is False
        env_path.write_text(
            "AGENTMAIL_API_KEY=inbox-scoped-test-key\n"
            "AGENTMAIL_INBOX_ID=participant@agentmail.to\n"
            "WORKSHOP_ALLOWED_RECIPIENTS=instructor@agentmail.to\n",
            encoding="utf-8",
        )
        configuration = client.get("/api/dashboard").json()["workshop"]["agentMail"]
        assert configuration["ready"] is True
        assert configuration["inboxId"] == "participant@agentmail.to"
    close_database()


def test_http_surface_follows_checkpoint(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "checkpoint.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setenv("WORKSHOP_PROFILE", "participant")
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-08-start")
    close_database()

    from pfefferminzia.app import create_app

    app = create_app()

    with TestClient(app) as client:
        dashboard = client.get("/api/dashboard").json()
        assert dashboard["workshop"]["checkpoint"]["name"] == "drill-08-start"
        assert dashboard["tickets"] == []
        assert sum(dashboard["counts"].values()) == 0
        assert dashboard["workshop"]["demoTickets"] == 0
        assert dashboard["workshop"]["workshopClaims"] == 0
        assert client.get("/api/todos").status_code == 200
        blocked = client.get("/api/tariffs")
        assert blocked.status_code == 400
        assert "intentionally unavailable" in blocked.json()["error"]

        monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-09-start")
        dashboard = client.get("/api/dashboard").json()
        assert [ticket["ticketNumber"] for ticket in dashboard["tickets"]] == ["PF-10002"]
        assert client.get("/api/tariffs").status_code == 200
        assert client.get("/api/claims").status_code == 400

    close_database()
