from __future__ import annotations

import re

from fastapi.testclient import TestClient

from pfefferminzia.app import create_app
from pfefferminzia.constants import ROOT


def test_tuesday_deck_is_served_without_a_build_step() -> None:
    client = TestClient(create_app())

    overview = client.get("/slides", follow_redirects=False)
    assert overview.status_code in (302, 307) and overview.headers["location"] == "/slides/decks.html"
    assert client.get("/slides/", follow_redirects=False).headers["location"] == "/slides/decks.html"
    html = client.get("/slides/index.html")
    script = client.get("/slides/dienstag.js")
    agentic_script = client.get("/slides/agentisch.js")
    board = client.get("/slides/vorstand.html")
    board_script = client.get("/slides/vorstand.js")
    board_d3 = client.get("/slides/assets/d3.v7.min.js")
    styles = client.get("/slides/dienstag.css")
    launcher = client.get("/slides/decks.html")
    personas = client.get("/slides/assets/agentisch/personas.webp")

    assert html.status_code == script.status_code == agentic_script.status_code == board.status_code == board_script.status_code == board_d3.status_code == styles.status_code == launcher.status_code == personas.status_code == 200
    assert "AI Studio — Dienstag: Vom Agenten zum System" in html.text
    assert 'src="./agentisch.js"' in html.text
    assert "https://d3js.org v7.9.0" in html.text
    assert "fetch('/api/management-report'" in board_script.text
    assert "d3.scaleLinear" in board_script.text and "const VIDEO" in board_script.text
    assert 'src="./vorstand.js"' in board.text and "pfefferminzia-logo" in board_script.text
    assert "vorstand.html" in launcher.text
    assert 'src="./dienstag.js"' in html.text
    assert "deck=agentisch" in launcher.text
    assert "application/javascript" in script.headers["content-type"] or "text/javascript" in script.headers["content-type"]
    assert "text/css" in styles.headers["content-type"]


def test_tuesday_deck_covers_all_five_milestones() -> None:
    script = (ROOT / "slides" / "dienstag.js").read_text(encoding="utf-8")
    ids = re.findall(r"\bid: '([^']+)'", script)

    assert len(ids) == 52
    assert len(ids) == len(set(ids))
    for milestone in ("Drill6Start", "Drill7Start", "Drill8Start", "Drill9Start", "Drill10Start"):
        assert milestone in ids
    # One task board per drill stays on the projector: four steps, done, early finish.
    assert script.count("taskBoard([") == 5
    assert script.count("Eure Aufgaben") == 5 and "Früher fertig?" in script
    # Every drill deck says where we are in the day; later drills open with a short recap.
    for drill in ("06", "07", "08", "09", "10"):
        assert f"zeitplan('drill-{drill}')" in script and f"'Zeitplan-drill-{drill}'" in script
    for drill in (6, 7, 8, 9):
        assert f"recap({drill}," in script and f"'Rueckblick{drill}'" in script
    assert "'Teilnehmende'" in script and "/api/instructor/roster" in script
    # The bridge from input to Drill 6, a group round per drill for early finishers, and an appendix.
    for slide in ("ZielVideo", "Mitnehmen", "Lernkonzept", "DrillRhythmus", "ReserveImmer", "AnhangWhiteboard", "AnhangAblauf"):
        assert slide in ids
    for drill in range(6, 11):
        assert f"reserve({drill}," in script and f"'Reserve{drill}', 'ReserveImmer'" in script
    assert "releases/download/workshop-medien/pfefferminzia-2-0-pitch.mp4" in script
    assert (ROOT / "docs" / "RESERVE_RUNDEN.md").is_file()
    assert "MCPWerkzeuge" in ids and "handout" in script
    assert "flach (nur den neuesten Stand) auf den Schreibtisch in den Ordner pfefferminzia-2" in script
    assert "Uebernickel" not in script and "Fragt Claude – oder mich." in script
    assert "LiveBeispiele" in ids
    assert "Cron" in script
    assert "Ich bin in Drill 6" in script
    assert "kein Werkzeug" in script
    for deck in ("gesamt", "input", "drill-06", "drill-07", "drill-08", "drill-09", "drill-10", "abschluss", "mittwoch", "teilnehmende", "anhang", "agentisch"):
        assert f"{deck}:" in script or f"'{deck}':" in script
    assert 'svg[aria-label^="Comicfigur Johannes"]' in script


def test_agentic_talk_retains_benchmarks_and_original_visuals() -> None:
    script = (ROOT / "slides" / "agentisch.js").read_text(encoding="utf-8")
    statements = re.findall(r"\bid: 'Agentisch[^']+'", script)
    pictures = re.findall(r"\bpicture\('Agentisch[^']+'", script)
    assert len(statements) + len(pictures) == 34
    assert len(pictures) == 14
    assert "Wie gut ist KI heute?" not in script
    assert "Humanity’s Last Exam" in script
    assert "METR" in script
    assert "89" in script
    assert "personas" in script and "council" in script
    images = re.findall(r"picture\('[^']+', '[^']+', '[^']+',\s*'[^']+', '([^']+)'", script)
    assert len(images) == 14
    for image in images:
        assert (ROOT / "slides" / "assets" / "agentisch" / f"{image}.webp").is_file()


def test_slide_screenshots_exist() -> None:
    script = (ROOT / "slides" / "dienstag.js").read_text(encoding="utf-8")
    for image in re.findall(r"\['([\w-]+\.webp)'", script):
        assert (ROOT / "slides" / "assets" / image).is_file(), image
