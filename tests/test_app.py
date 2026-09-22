from fastapi.testclient import TestClient

from pfefferminzia.database import close_database


def test_python_host_serves_api_and_browser_workspace(monkeypatch, tmp_path):
    monkeypatch.setenv("PFEFFERMINZIA_DB_PATH", str(tmp_path / "pfefferminzia.db"))
    monkeypatch.setenv("AGENTMAIL_API_KEY", "")
    monkeypatch.setenv("AUTO_SEND_ENABLED", "false")
    monkeypatch.setenv("WORKSHOP_PROFILE", "participant")
    close_database()

    from pfefferminzia.app import app

    with TestClient(app) as client:
        assert client.get("/api/health").json() == {"ok": True, "service": "pfefferminzia"}
        dashboard = client.get("/api/dashboard")
        assert dashboard.status_code == 200
        assert len(dashboard.json()["tickets"]) == 7
        assert dashboard.json()["workshop"]["checkpoint"]["name"] == "drill-11-complete"
        page = client.get("/")
        assert page.status_code == 200
        assert '<div id="root"></div>' in page.text

    close_database()
