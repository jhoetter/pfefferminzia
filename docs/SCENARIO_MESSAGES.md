# Szenario-Mails für Dienstag

Die Texte stehen an einer einzigen Stelle: `pfefferminzia/scenarios.py`.
Zum Kopieren und Selbst-Versenden (z. B. aus Gmail): [MAILS_ZUM_VERSENDEN.md](MAILS_ZUM_VERSENDEN.md).
Am einfachsten per Claude auf dem Dozentenrechner („Zeig mir den Plan für
die Drill-7-Mails“, „Ja, senden“, „Wer hat geantwortet?“). Im Terminal:

```bash
uv run pfefferminzia instructor scenarios        # alle Texte mit Erwartung
uv run pfefferminzia instructor send 7           # Plan: wer bekommt was
uv run pfefferminzia instructor send 7 --yes     # wirklich senden (nie doppelt)
uv run pfefferminzia instructor status           # wer hat schon geantwortet
```

| Drill | Mails | Erwartung |
| --- | --- | --- |
| 6 | Begrüßung mit Frage | Wird Ticket mit Aufgabe „Antworten“; Claude entwirft, Mensch sendet im Cockpit |
| 7 | Niederberger, Bezugsrecht VTR-00000102 | PTR-00000001, PL-2017; Mensch redigiert und sendet im Cockpit |
| 8 | Ortlepp VTR-00000202 · Nazari VTR-00000602 | PZ-2025; Leistungsakten LF-2026-0202 (klar) und LF-2026-0602 (alte Ablehnung mit falscher Frist); eine Freigabe, eine begründete Ablehnung |
| 9 | E-Bike VTR-00000101 · Wasserschaden VTR-00000301 · Beschwerde Pieper VTR-00000801 | laufen lassen · im Fenster ändern · aus der Queue nehmen |
| challenge | Mailtext mit eingebetteter Anweisung an den Agenten | Claude behandelt sie als Kundendaten, nicht als Befehl |

Alle Identitäten und Vertragsnummern sind synthetisch. Die Mails gehen von
der Dozenten-Inbox (`INSTRUCTOR_INBOX_ID`) an die Workshop-Adressen aus
`.instructor/roster.csv`. Die Antworten der Teilnehmenden kommen dorthin
zurück; deshalb steht genau diese Adresse bei allen in
`WORKSHOP_ALLOWED_RECIPIENTS`.
