from __future__ import annotations

from fastapi.testclient import TestClient

from pfefferminzia.app import create_app
from pfefferminzia.database import create_database
from pfefferminzia.management_report import capture_report_snapshot, read_report_snapshot


def test_report_snapshot_contains_only_aggregated_counts(tmp_path):
    source = tmp_path / "source"
    target = tmp_path / "target"
    (source / ".data").mkdir(parents=True)
    db = create_database(source / ".data" / "pfefferminzia.db")
    stamp = "2026-09-29T14:00:00Z"
    for number, demo, line in (("PF-SECRET-1", 0, "liability"), ("PF-DEMO-2", 1, "life")):
        db.execute(
            """INSERT INTO tickets
            (ticket_number, source, customer_email, subject, status, product_line, is_demo,
             created_at, updated_at, last_message_at)
            VALUES (?, ?, ?, ?, 'sent', ?, ?, ?, ?, ?)""",
            (number, "demo" if demo else "agentmail", "secret@example.invalid", "Private subject", line, demo, stamp, stamp, stamp),
        )
    ticket_id = db.execute("SELECT id FROM tickets WHERE ticket_number = 'PF-SECRET-1'").fetchone()[0]
    db.execute(
        "INSERT INTO ticket_events (ticket_id, type, actor, details_json, created_at) VALUES (?, 'reply_sent', 'auto-send-worker', ?, ?)",
        (ticket_id, '{"body":"Private body"}', stamp),
    )
    db.close()

    capture_report_snapshot(source, target, "drill-11-start")
    report = read_report_snapshot(target)
    assert report["sourceCheckpoint"] == "drill-11-start"
    assert sum(row["count"] for row in report["tickets"]) == 2
    assert report["events"] == [{"type": "reply_sent", "mode": "automatic", "count": 1}]
    raw = (target / ".data" / "management-report.json").read_text(encoding="utf-8")
    for forbidden in ("PF-SECRET-1", "secret@example.invalid", "Private subject", "Private body"):
        assert forbidden not in raw


def test_report_api_is_gated_to_final_drill(monkeypatch):
    import pfefferminzia.app as app_module

    monkeypatch.setattr(app_module, "read_report_snapshot", lambda: {"tickets": [], "events": []})
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-11-start")
    assert TestClient(create_app()).get("/api/management-report").status_code == 400
    monkeypatch.setenv("WORKSHOP_CHECKPOINT", "drill-12-start")
    response = TestClient(create_app()).get("/api/management-report")
    assert response.status_code == 200
    assert response.json() == {"tickets": [], "events": []}
