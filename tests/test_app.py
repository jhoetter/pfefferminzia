from fastapi.testclient import TestClient
import pytest

from pfefferminzia.database import close_database


def test_python_host_serves_api_and_browser_workspace(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "pfefferminzia.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setenv("WORKSHOP_PROFILE", "participant")
    close_database()

    from pfefferminzia.app import create_app

    app = create_app()

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"ok": True, "service": "pfefferminzia"}
        dashboard = client.get("/api/dashboard")
        assert dashboard.status_code == 200
        assert len(dashboard.json()["tickets"]) == 7
        assert dashboard.json()["workshop"]["checkpoint"]["name"] == "drill-11-complete"
        page = client.get("/")
        assert page.status_code == 200
        assert '<div id="root"></div>' in page.text
        assert '/workshop.js' in page.text
        assert client.get("/workshop.js").headers["content-type"].startswith("text/javascript")
        assert client.get("/workshop.css").headers["content-type"].startswith("text/css")

    close_database()


def test_partial_agentmail_configuration_fails_at_startup(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "partial-agentmail.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "configured-but-incomplete")
    monkeypatch.delenv("AGENTMAIL_INBOX_ID", raising=False)
    monkeypatch.delenv("WORKSHOP_ALLOWED_RECIPIENTS", raising=False)
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    close_database()

    from pfefferminzia.app import create_app

    with pytest.raises(RuntimeError, match="AGENTMAIL_INBOX_ID"):
        with TestClient(create_app()):
            pass
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
