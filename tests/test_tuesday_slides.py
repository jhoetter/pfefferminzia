from __future__ import annotations

import re

from fastapi.testclient import TestClient

from pfefferminzia.app import create_app
from pfefferminzia.constants import ROOT


def test_tuesday_deck_is_served_without_a_build_step() -> None:
    client = TestClient(create_app())

    html = client.get("/slides/")
    script = client.get("/slides/dienstag.js")
    agentic_script = client.get("/slides/agentisch.js")
    styles = client.get("/slides/dienstag.css")
    launcher = client.get("/slides/decks.html")
    personas = client.get("/slides/assets/agentisch/personas.webp")

    assert html.status_code == script.status_code == agentic_script.status_code == styles.status_code == launcher.status_code == personas.status_code == 200
    assert "AI Studio — Dienstag: Vom Agenten zum System" in html.text
    assert 'src="./agentisch.js"' in html.text
    assert 'src="./dienstag.js"' in html.text
    assert "deck=agentisch" in launcher.text
    assert "application/javascript" in script.headers["content-type"] or "text/javascript" in script.headers["content-type"]
    assert "text/css" in styles.headers["content-type"]


def test_tuesday_deck_covers_all_four_milestones() -> None:
    script = (ROOT / "slides" / "dienstag.js").read_text(encoding="utf-8")
    ids = re.findall(r"\bid: '([^']+)'", script)

    assert len(ids) == 26
    assert len(ids) == len(set(ids))
    for milestone in ("Drill8Start", "Drill9Start", "Drill10Start", "Drill11Start"):
        assert milestone in ids
    assert script.count("dialogueStep(") == 16
    assert "DEIN SCHRITT" in script
    assert "Dialog statt Zauberprompt" in script
    assert "LiveBeispiele" in ids
    assert "Vorausbauend" in script
    assert "Cron" in script
    assert "keine echte Aktion" in script
    for deck in ("gesamt", "input", "drill-08", "drill-09", "drill-10", "drill-11", "abschluss", "agentisch"):
        assert f"{deck}:" in script or f"'{deck}':" in script
    assert 'svg[aria-label^="Comicfigur Johannes"]' in script


def test_agentic_talk_retains_benchmarks_and_original_visuals() -> None:
    script = (ROOT / "slides" / "agentisch.js").read_text(encoding="utf-8")
    statements = re.findall(r"\bid: 'Agentisch[^']+'", script)
    pictures = re.findall(r"\bpicture\('Agentisch[^']+'", script)
    assert len(statements) + len(pictures) == 36
    assert len(pictures) == 15
    assert "Humanity’s Last Exam" in script
    assert "METR" in script
    assert "89" in script
    assert "personas" in script and "council" in script
    for image in re.findall(r"picture\('[^']+', \d+, '[^']+',\s*'[^']+', '([^']+)'", script):
        assert (ROOT / "slides" / "assets" / "agentisch" / f"{image}.webp").is_file()
