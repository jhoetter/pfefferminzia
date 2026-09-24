/* Faithful, visual-first remake of Johannes' 35-page June 2026 talk. No build step. */
(() => {
  const picture = (id, page, title, subtitle, file, caption, focus = 'top') => ({
    id, type: 'Praxisbild', eyebrow: `Originalvortrag · Folie ${page}`, title, subtitle, visual: true,
    body: `<a class="day-evidence ${focus}" href="./assets/agentisch/${file}.webp" target="_blank" rel="noopener" aria-label="Originalbild ${caption} in voller Größe öffnen"><img src="./assets/agentisch/${file}.webp" alt="${caption}"><span>Originalbild öffnen ↗</span></a>`,
    notes: `Originalfolie ${page} aus Johannes Hötters PDF (Juni 2026). ${caption}. Das Bild ist ein Zeitzeugnis des damaligen Arbeitsstands; für Details das Originalbild öffnen.`
  });

  const hle = [
    ['Jan 25', 2.7], ['Mär', 9], ['Mai', 15], ['Aug', 26],
    ['Nov', 41], ['Feb 26', 56], ['Apr 26', 64.7]
  ];
  const hleChart = `<div class="day-benchmark-bars">${hle.map(([label, value]) =>
    `<div class="day-benchmark-column"><span>${String(value).replace('.', ',')} %</span><div style="height:${Math.max(15, Math.round(value / 64.7 * 265))}px"></div><small>${label}</small></div>`
  ).join('')}</div><div class="day-benchmark-warning">Illustrativer Verlauf aus dem Originalvortrag · verschiedene Modelle/Setups, kein Like-for-like-Vergleich</div>`;
  const metrChart = `<div class="day-metr"><div class="day-metr-number">89 <small>Tage</small></div><p>Verdopplungszeit des geschätzten <strong>50%-Time-Horizon</strong> seit 2024 (METR TH1.1).</p><div class="day-metr-track"><span>2023 · 0,05 h</span><span>2024 · 0,5 h</span><span>2025 · 4 h</span><span>2026 · 14,5 h</span></div><small>Stufenwerte aus Johannes’ Originalfolie: illustrativ, keine METR-Zeitreihe.</small></div>`;

  window.PFEFFERMINZIA_AGENTISCH_SLIDES = [
    {
      id: 'AgentischTitel', type: 'Titel', eyebrow: 'Johannes Hötter · Impuls', cover: true,
      body: `<div class="day-cover-title">JEDE AUFGABE<br>ZUERST AGENTISCH</div><div class="day-cover-sub">Arbeiten in agentischen Teams.</div><div class="day-cover-ribbon">EIN MENSCH · VIELE AGENTEN</div>`,
      notes: 'Überführung des Originalvortrags „Arbeiten in Agentischen Teams“, Juni 2026. Der Inhalt bleibt ein persönlicher Praxisbericht; die Gestaltung ist die Falk-Workshop-Vorlage.'
    },
    {
      id: 'AgentischProfil', type: 'Statement', eyebrow: 'Kurz zu mir · Stand Juni 2026',
      title: 'Kern AI gegründet. Verkauft. Wieder am Bauen.',
      subtitle: 'Gründungen sind mein Labor für neue Formen der Arbeit.',
      body: `<div class="day-hero-line">Johannes Hötter<br>Gründer &amp; Builder</div>`,
      notes: 'Originalfolie 2: Kern AI 2020 gegründet, 2025 verkauft. Angekündigte spätere Rollen bewusst nicht als gegenwärtige Fakten behaupten.'
    },
    {
      id: 'AgentischStatus', type: 'Kapitel', eyebrow: '00 · Kurzer Status quo',
      title: 'Wie gut ist KI heute?', subtitle: 'Zwei Benchmarks, zwei sehr verschiedene Messfragen.',
      body: `<div class="day-hero-line">Fähigkeit ≠ Verlässlichkeit.</div>`,
      notes: 'Originalfolie 3. HLE misst geschlossene Expertenfragen. METR misst die menschliche Dauer von Aufgaben, die ein Agent mit bestimmter Erfolgswahrscheinlichkeit löst. Nicht verwechseln.'
    },
    {
      id: 'AgentischHLE', type: 'Diagramm', eyebrow: 'Humanity’s Last Exam · Originalgrafik',
      title: '2,7 → 64,7 %: ein starkes Signal, kein sauberer Zeitvergleich.',
      subtitle: 'HLE prüft schwierige, geschlossene Expertenfragen. Die Originalkurve ist illustrativ.',
      body: hleChart,
      source: 'Originalfolie 4 (illustrativ) · <a href="https://labs.scale.com/leaderboard/humanitys_last_exam" target="_blank" rel="noopener">Scale Labs HLE</a> · <a href="https://www-cdn.anthropic.com/08ab9158070959f88f296514c21b7facce6f52bc.pdf" target="_blank" rel="noopener">Anthropic System Card 2026: 64,7 % mit Tools</a>',
      notes: 'Originalfolie 4 rekonstruieren. 64,7 % ist für Claude Mythos Preview mit Tools in Anthropic’s System Card (April 2026) ausgewiesen. Die 2,7 % und Zwischenwerte stammen aus Johannes’ illustrativer Originalgrafik; sie vergleichen weder dasselbe Modell noch zwingend dasselbe HLE-Protokoll. Scale Labs hat HLE seither aktualisiert. Diese Einschränkung ausdrücklich sagen.'
    },
    {
      id: 'AgentischMETR', type: 'Diagramm', eyebrow: 'METR · Task-Completion Time Horizon',
      title: 'Der gemessene Aufgabenhorizont wächst schnell.',
      subtitle: 'Seit 2024 schätzt METR für TH1.1 eine Verdopplung etwa alle 89 Tage.',
      body: metrChart,
      source: '<a href="https://metr.org/blog/2026-1-29-time-horizon-1-1/" target="_blank" rel="noopener">METR, Time Horizon 1.1 (2026)</a> · Originalfolie 5 (Stufenwerte illustrativ)',
      notes: 'METR TH1.1 berichtet für P50 seit 2024 rund 88,6 Tage Verdopplungszeit. Die Zahlen 0,05/0,5/4/14,5 Stunden sind Johannes’ illustrative Folienwerte und keine abgelesene METR-Serie. Die Originalaussage „Zeit, die KI autonom durcharbeitet“ ist methodisch zu grob.'
    },
    {
      id: 'AgentischMETRDefinition', type: 'Statement', eyebrow: 'Wichtig für die Einordnung',
      title: '14,5 Stunden heißt nicht: Der Agent arbeitet 14,5 Stunden allein.',
      subtitle: 'Time Horizon = menschliche Aufgabendauer bei prognostizierten 50 % Agentenerfolg.',
      body: `<div class="day-hero-line">Aufgabenschwierigkeit,<br>nicht Laufzeit.</div>`,
      source: '<a href="https://metr.org/time-horizons/" target="_blank" rel="noopener">METR: Definition und Einschränkungen</a>',
      notes: 'METR sagt explizit: Ein 50%-Time-Horizon ist keine tatsächliche autonome Laufzeit. Die Aufgaben sind überwiegend Software, ML und Cybersecurity, gut spezifiziert und automatisch prüfbar. Nicht auf beliebige Jobs übertragen.'
    },
    {
      id: 'AgentischPraxisKapitel', type: 'Kapitel', eyebrow: '01 · Aus der Praxis',
      title: 'Was hat sich für mich konkret verändert?',
      body: `<div class="day-hero-line">Weniger Übergaben.<br>Mehr Iteration.</div>`,
      notes: 'Originalfolie 6. Die folgenden Zahlen und Beispiele sind persönliche Erfahrung, keine allgemeine Wirksamkeitsstudie.'
    },
    {
      id: 'AgentischPraxis', type: 'Statement', eyebrow: 'Meine Praxis',
      title: 'Früher 15 Mitarbeitende. Heute ich und viele Agenten.',
      subtitle: 'Produktivität, Qualität und Kommunikations-Overhead neu erleben.',
      body: `<div class="day-hero-line">Ich führe Arbeit,<br>nicht nur Prompts.</div>`,
      notes: 'Originalfolie 7. Persönliche Erfahrung; die Zahl 15 bezeichnet Johannes’ früheres Team. Kein universeller Produktivitätsvergleich.'
    },
    picture('AgentischTokens', 8, 'Wie viele Token dabei durchlaufen',
      'Das Original-Dashboard macht die Größenordnung sichtbar.', 'token-usage', 'Token-Dashboard mit Nutzungsdiagrammen'),
    picture('AgentischVolvo', 9, 'Zwei Jahre KI-Kosten: ungefähr ein gebrauchter Volvo.',
      'Ein persönlicher Investmentmaßstab. Kein Budgetrezept.', 'volvo', 'Foto eines gebrauchten Volvo XC40'),
    {
      id: 'AgentischIterieren', type: 'Statement', eyebrow: 'Recommendation',
      title: 'Aufbauen. Abreißen. Besser neu bauen.',
      subtitle: 'Wenn Varianten billig werden, wird gutes Urteil wertvoller.',
      body: `<div class="day-hero-line">Mut zum zweiten Entwurf.</div>`,
      notes: 'Originalfolie 10. Das Hausbau-Bild als Arbeitsmuster: ausprobieren, prüfen, verwerfen. Nicht ungeprüft produktiv setzen.'
    },
    {
      id: 'AgentischGalerie', type: 'Kapitel', eyebrow: '01 · Aus der Praxis',
      title: 'Und ehrlich: Da entsteht viel.',
      subtitle: 'Ein Querschnitt aus Johannes’ Originalbeispielen.',
      body: `<div class="day-hero-line">Nicht erzählen.<br>Zeigen.</div>`,
      notes: 'Originalfolie 11. Die nächsten sechs Slides zeigen wieder die tatsächlichen Screenshots aus dem PDF statt sie in einen abstrakten Satz aufzulösen.'
    },
    picture('AgentischArchitektur', 12, 'Vom Prompt zum 3D-Werkzeug',
      'Ein visuelles Produkt als konkretes Ergebnis.', 'architecture', '3D-Hausansicht in einem Architekturwerkzeug'),
    picture('AgentischRisiko', 13, 'Auch Tabellen werden Arbeitsflächen.',
      'Risikoszenarien als bearbeitbares Artefakt.', 'risk-scenarios', 'Risikotabelle in einer Tabellenanwendung'),
    picture('AgentischThese', 14, 'Research und Storytelling gehören dazu.',
      'Die eigene Masterarbeit als Beispiel.', 'thesis', 'Präsentationsentwurf zur Masterarbeit'),
    picture('AgentischExpenses', 15, 'Operative Software: Ausgaben im Blick.',
      'Daten, Kategorien und Visualisierung in einer Oberfläche.', 'expenses', 'Ausgaben-Dashboard mit Tabelle und Diagrammen'),
    picture('AgentischMail', 16, 'E-Mail ist nicht bloß Textausgabe.',
      'Eine echte, bedienbare Arbeitsumgebung.', 'mail', 'E-Mail-Oberfläche mit Postfach und geöffnetem Thread'),
    picture('AgentischDrive', 17, 'Dokumente gehören in denselben Workflow.',
      'Dateien, Kontext und Weitergabe.', 'drive', 'Dateiablage mit Dokumentliste'),
    {
      id: 'AgentischPrinzip', type: 'Kapitel', eyebrow: '02 · Das Prinzip',
      title: 'Jede Aufgabe wird zuerst agentisch versucht. Jede.',
      body: `<div class="day-hero-line">Erst fragen, dann entscheiden.</div>`,
      notes: 'Originalfolie 18. Das ist eine Suchheuristik, keine Aufforderung, jede Entscheidung abzugeben.'
    },
    {
      id: 'AgentischFrage', type: 'Statement', eyebrow: 'Recommendation',
      title: 'Kann ich diesen Teil nicht mit KI lösen?',
      subtitle: 'Sobald etwas Struktur hat, kann ein Agent oft mit Code helfen.',
      body: `<div class="day-hero-line">Eine Frage vor jedem Schritt.</div>`,
      notes: 'Originalfolie 19. „Meist kann sie das auch noch besser als ich“ als persönliche Erfahrung einordnen; Prüfbarkeit bleibt Voraussetzung.'
    },
    picture('AgentischExposure', 20, 'Welche Arbeit verändert sich?',
      'Die Originalfolie nutzt eine Job-Exposure-Treemap als Diskussionsanstoß.', 'exposure', 'Treemap zu Job-Exposure', 'center'),
    picture('AgentischCode', 21, 'Der Agent arbeitet an echtem Code.',
      'Diffs und Tests machen den Eingriff überprüfbar.', 'code-review', 'Agenten-Session mit Code-Diff'),
    picture('AgentischTracker', 22, 'Arbeit braucht Status und Eigentümer.',
      'Ein Tracker macht Agenten- und Menschenarbeit gemeinsam sichtbar.', 'tracker', 'Sonaloop-Aufgaben-Tracker'),
    picture('AgentischDeckBuilder', 23, 'Sogar dieser Foliensatz ist ein Artefakt.',
      'Inhalt, Visual und Ausgabe in einer Oberfläche.', 'deck-builder', 'Foliensatz-Editor mit Vorschau und Formular'),
    {
      id: 'AgentischVerifier', type: 'Statement', eyebrow: 'Verifier’s Law',
      title: 'Leicht überprüfbare Aufgaben werden leichter delegierbar.',
      subtitle: 'Prüfung ist kein Nachgedanke, sondern Teil des Arbeitsdesigns.',
      body: `<div class="day-hero-line">Auftrag → Beleg → Abnahme.</div>`,
      source: 'Originalfolie 24 · Jason Wei, Verifier’s Law (2025)',
      notes: 'Die Originalfolie zitiert Jason Wei. Hier eine deutsche Paraphrase. Nicht als Gewissheit über alle Aufgaben oder einen Freibrief für externe Wirkung auslegen.'
    },
    {
      id: 'AgentischSystemKapitel', type: 'Kapitel', eyebrow: '03 · Größer gedacht',
      title: 'Warum jetzt System-Denken entscheidet.',
      body: `<div class="day-hero-line">Ein Prompt ist noch kein System.</div>`,
      notes: 'Originalfolie 25. Von der einzelnen Agenteninteraktion zum gemeinsamen Arbeits- und Qualitätssystem überleiten.'
    },
    {
      id: 'AgentischSystem', type: 'Inhalt', eyebrow: 'System-Denken ist Pflicht',
      title: 'Drei Bausteine halten Agentenarbeit zusammen.',
      body: `<div class="day-flow"><div class="day-flow-step"><b>Design-System</b><span>eine Sprache</span></div><div class="day-arrow">+</div><div class="day-flow-step"><b>Aufgaben-Tracker</b><span>sichtbare Zustände</span></div><div class="day-arrow">+</div><div class="day-flow-step"><b>Über Code hinaus</b><span>gemeinsame Arbeit</span></div></div>`,
      notes: 'Originalfolie 26. Drei Komponenten und ihre Rolle. Die nächste Folie zeigt das Design-System tatsächlich.'
    },
    picture('AgentischDesignSystem', 27, 'Eine Sprache für Mensch und Agent.',
      'Das Sonaloop-Design-System als konkrete Quelle der Wahrheit.', 'design-system', 'Sonaloop-Design-System mit Komponenten und Farben'),
    {
      id: 'AgentischNeuBauen', type: 'Inhalt', eyebrow: 'Warum so viel möglich ist',
      title: 'Bestehendes neu bauen ≠ Neues erfinden.',
      body: `<div class="day-grid two"><div class="day-card"><h3>Bekanntes</h3><p class="day-emphasis">Die Form ist schon da.</p><p>Agenten können Struktur und Umsetzung rasch variieren.</p></div><div class="day-card mint-card"><h3>Neues</h3><p class="day-emphasis">Die Frage ist noch offen.</p><p>Ziel, Geschmack und Grenzen brauchen menschliches Urteil.</p></div></div>`,
      notes: 'Originalfolie 28. Cleanroom Engineering versus etwas Neues schaffen; nicht als harte Trennung, sondern als unterschiedliche Designarbeit.'
    },
    {
      id: 'AgentischSchnittstelle', type: 'Statement', eyebrow: 'Meine Produktregel',
      title: 'Ich baue keine Software ohne agentische Schnittstelle.',
      subtitle: 'API, MCP und CLI machen dieselben Funktionen für Mensch und Agent nutzbar.',
      body: `<div class="day-hero-line">API · MCP · CLI</div>`,
      notes: 'Originalfolie 29. Pfefferminzia 2.0 ist die praktische Brücke: Browser und Claude nutzen dieselbe Python-Fachlogik.'
    },
    {
      id: 'AgentischQualitaet', type: 'Statement', eyebrow: 'Law of Amplification',
      title: 'Wenn Durchsatz ×100 wird: Wie hält Qualität mit?',
      subtitle: 'Die Zahl ist ein Gedankenexperiment, keine gemessene Prognose.',
      body: `<div class="day-hero-line">Der Engpass wandert.</div>`,
      notes: 'Originalfolie 30. Den 100-fachen Durchsatz als rhetorisches Szenario kennzeichnen. Frage: Welche Kontrollen skalieren, welche bleiben bewusst menschlich?'
    },
    picture('AgentischPersonas', 31, 'Personas machen Unterschiede sichtbar.',
      'Nicht „der Nutzer“, sondern Menschen mit gegensätzlichen Lebenslagen.', 'personas', 'Persona-Karten verschiedener Berufe und Alltagssituationen'),
    picture('AgentischCouncil', 32, 'Personas können Ideen widersprechen.',
      'Die Council-Ansicht zeigt Stimmen, Einwände und Belege.', 'council', 'Projektansicht mit Persona-Stimmen und Skepsis'),
    {
      id: 'AgentischSprache', type: 'Statement', eyebrow: 'Interface-Shift',
      title: 'Manchmal ist Sprechen schneller als Klicken.',
      subtitle: 'Kontext und Absicht diktieren, statt in Menüs zusammensuchen.',
      body: `<div class="day-hero-line">Sprache statt Maus?</div>`,
      notes: 'Originalfolie 33. Persönliche Arbeitsweise, keine universelle Regel. Zugänglichkeit, Umgebungen und Textkorrektur mitdenken.'
    },
    {
      id: 'AgentischTeam', type: 'Statement', eyebrow: 'Offene Organisationsfrage',
      title: 'Heute ein Mensch, viele Agenten. Morgen?',
      subtitle: 'Wie arbeiten mehrere Menschen mit mehreren Agenten zusammen?',
      body: `<div class="day-hero-line">Wer koordiniert?<br>Wer verantwortet?</div>`,
      notes: 'Originalfolie 34. Diese Frage führt direkt zur Governance-Diskussion im Workshop.'
    },
    {
      id: 'AgentischBruecke', type: 'Schluss', eyebrow: 'Nächster Schritt',
      title: 'Nimm eine Aufgabe und frag: Geht das agentisch?',
      subtitle: 'Und danach: Welchen Beleg brauche ich? Wer darf wirken?',
      body: `<div class="day-hero-line">Wo darf der Agent handeln?</div>`,
      notes: 'Originalfolie 35 mit dem Call to Action. Für diesen Workshop: direkt zu Pfefferminzia und den zwei Kontrollmustern überleiten. Kontakt laut Original-PDF: Johannes Hötter, LinkedIn und E-Mail.'
    }
  ];
})();
