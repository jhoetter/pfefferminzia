"""Write docs/MAILS_ZUM_VERSENDEN.md from the scenario mails."""

from pathlib import Path

from pfefferminzia.scenarios import mail_texts_markdown

target = Path(__file__).resolve().parent.parent / "docs" / "MAILS_ZUM_VERSENDEN.md"
target.write_text(mail_texts_markdown(), encoding="utf-8")
print(f"geschrieben: {target}")
