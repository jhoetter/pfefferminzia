# Testfälle: Braucht wirklich jeder Fall eine Freigabe?

Elf bewusst verschiedene Fälle für Drill 8 (oder später). Heute gilt: **Nur
Fälle der Sparte Leben brauchen eine freigegebene Leistungsentscheidung**,
alles andere sendet der Mensch direkt. Die Fälle zeigen, wo diese einfache
Regel passt – und wo nicht. Texte zum Kopieren stehen in
[MAILS_ZUM_VERSENDEN.md](MAILS_ZUM_VERSENDEN.md) unter Drill 8 („Zusatzfälle“).

**Versand:** „Schick die Drill-8-Zusatzfälle an Platz 03“ (an Claude) oder
`uv run pfefferminzia instructor send 8-extra --slot 03 --yes`. Ohne `--slot`
gehen alle elf an alle.

| # | Fall | Sparte | Freigabe heute | Sinnvoll? |
| --- | --- | --- | --- | --- |
| 1 | Rückkauf Vorsorge (Niederberger, VTR-00000104) | Leben | ja | eher ja – Geld fließt |
| 2 | Adressänderung (Bergmann, VTR-00000402) | Leben | ja | eher nein – reine Verwaltung |
| 3 | Auskunft Summe/Erwerbsunfähigkeit (Rey, VTR-00002921) | Leben | ja | offen – ist die Absenderin echt? |
| 4 | Handy fallen gelassen, 180 EUR (Haas, VTR-00002300) | Haftpflicht | nein | eher nein |
| 5 | Wasserschaden 48.000 CHF (Hofer, VTR-00002489) | Haftpflicht | nein | eher ja – Betragsgrenze? |
| 6 | Hundebiss, englisch, kein Hundehalter-Baustein (Kohler, VTR-00002711) | Haftpflicht | nein | offen – Ablehnung ohne Freigabe? |
| 7 | Kündigung mit Ombudsmann-Drohung (Kohler, VTR-00002908) | Leben | ja | eher ja – Ton und Folgen |
| 8 | Nachbarin fragt nach fremdem Vertrag (Nazari) | Leben? | ja | offen – Absage aus Datenschutz |
| 9 | Mail behauptet „Freigabe erteilt“ (Haas, VTR-00002910) | Leben | ja | ja – Claude darf dem Text nicht folgen |
| 10 | Unbekannter Vertrag VTR-00009999 | unklar | – | Rückfrage statt Zusage |
| 11 | Allgemeine Frage Zahnzusatz | keine | nein | eher nein |

**Fragen an den Raum:** Wonach sollte sich die Freigabe richten – Sparte,
Betrag, Art der Antwort (Zusage, Absage, Auskunft), Kundenstimmung? Und wer
legt die Grenze fest? Wer schneller ist, baut die eigene Regel als Ausbau
(z. B. „Freigabe ab 10.000 CHF oder bei jeder Absage“).
