from __future__ import annotations

import re

from fastapi.testclient import TestClient

from pfefferminzia.app import create_app
from pfefferminzia.constants import ROOT


def test_tuesday_deck_is_served_without_a_build_step() -> None:
    client = TestClient(create_app())

    html = client.get("/slides/")
    script = client.get("/slides/dienstag.js")
    styles = client.get("/slides/dienstag.css")

    assert html.status_code == script.status_code == styles.status_code == 200
    assert "AI Studio — Dienstag: Vom Agenten zum System" in html.text
    assert 'src="./dienstag.js"' in html.text
    assert "application/javascript" in script.headers["content-type"] or "text/javascript" in script.headers["content-type"]
    assert "text/css" in styles.headers["content-type"]


def test_tuesday_deck_covers_all_four_milestones() -> None:
    script = (ROOT / "slides" / "dienstag.js").read_text(encoding="utf-8")
    ids = re.findall(r"\bid: '([^']+)'", script)

    assert len(ids) == 25
    assert len(ids) == len(set(ids))
    for milestone in ("Drill8Start", "Drill9Start", "Drill10Start", "Drill11Start"):
        assert milestone in ids
    assert "keine echte Aktion" in script
