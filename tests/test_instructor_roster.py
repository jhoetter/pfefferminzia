from __future__ import annotations

from pfefferminzia.instructor import roster_preview, write_roster


def test_roster_preview_shows_first_names_and_only_the_start_of_keys(tmp_path):
    rows = [
        {"slot": "01", "name": "Dr. Erika Muster", "email": "", "inbox_id": "a@x", "api_key": "am_us_inbox_aaaa1111" + "x" * 40},
        {"slot": "02", "name": "Max Beispiel", "email": "", "inbox_id": "b@x", "api_key": "am_us_inbox_bbbb2222" + "y" * 40},
    ]
    write_roster(rows, tmp_path)
    preview = roster_preview(tmp_path)
    assert [row["firstName"] for row in preview] == ["Erika", "Max"]
    assert preview[0]["keyStart"] == "am_us_inbox_aaaa…"
    assert all("x" * 5 not in row["keyStart"] and "y" * 5 not in row["keyStart"] for row in preview)
