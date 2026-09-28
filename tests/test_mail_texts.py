from pathlib import Path

from pfefferminzia.scenarios import SCENARIOS, mail_texts_markdown

DOC = Path(__file__).resolve().parent.parent / "docs" / "MAILS_ZUM_VERSENDEN.md"


def test_copy_paste_mails_match_the_scenarios():
    text = DOC.read_text(encoding="utf-8")
    # Regenerate with scripts/write_mail_texts.py when a scenario changes.
    assert text == mail_texts_markdown()
    for scenario in SCENARIOS:
        assert scenario["subject"] in text and scenario["text"].rstrip() in text
    assert "jt.hoetter@gmail.com" in text and "pfefferminzia-17@agentmail.to" in text
