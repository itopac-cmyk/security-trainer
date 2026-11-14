# Security Trainer

Progressive Web App zum täglichen Lernen von Security-Begriffen **und** -Konzepten – als Karteikarten mit Erklärungen, interaktiven Konzept-Modulen, Praxis-Szenarien und Prüfungsmodus.

## Inhalte

| Bereich | Umfang |
|---|---|
| Decks | 10 (Grundlagen, Kryptografie, CISM, CISSP, CRA, MVO, OT/IEC 62443, Decision-Modelle, CISO-Glossar, Cyber Security Praxis) |
| Cluster | 171 (max. 22 Karten je Cluster) – CISSP in 34 Untergruppen der 8 CBK-Domänen, CISO-Glossar nach NIST CSF 2.0 (Govern bis Recover), Praxis-Deck in 17 Themenclustern (OWASP, ATT&CK, AD, SOC, Cloud, Ransomware, E-Mail, Pentest, Frameworks, NIS2/BSI, Vulnerability Management, Härtung, Identität) |
| Karten | 1.227 (877 Begriffe, 350 Konzepte, davon 73 Vergleichskarten) – englischer Originalbegriff als Titel, Erklärung auf Deutsch, Beispiel als Mini-Fall; neue Karten zusätzlich mit Prüfungsfalle, Verwechslungspartner und Quelle |
| Konzept-Module | 12 mit Theorie und 72 Tap-Übungen (Auswahl, Zuordnen, Reihenfolge) |
| Szenarien | 24 mit 138 Entscheidungsfragen und Begründungen |
| Prüfungspool | 478 Fragen, Schnelltest (10 / 6 min) und Vollprüfung (20 / 12 min), Bestehensgrenze 80 % |

## Funktionen

- **Heutiger Tagesmix**: bis zu 15–20 Karten aus allen Decks; Wiederholungen nach Fälligkeit und Priorität gewichtet (Kernkarten bevorzugt), höchstens 30 % neue Begriffe und Konzepte
- Deck-Seiten mit Clustern: einzeln trainierbar, inklusive verknüpfter Karten aus anderen Decks
- Suche über alle Karten (englische Fachbegriffe, deutsche Bezeichnungen, Synonyme und eingeordnete Unterbegriffe)
- Reifegrad-Badge im CISO-Deck (etabliert, Trend, aufkommend)
- Leitner-Wiederholung (Intervalle 0, 1, 3, 7, 14, 30 Tage; falsch → in 10 Minuten erneut)
- Tagesziel (Standard 15, einstellbar), Serie und beste Serie
- Fehlerbox: falsch beantwortete Fragen, gelöst nach zwei richtigen Antworten
- Offline-fähig über Service Worker, installierbar auf iOS und Android
- Fortschritt nur lokal im Browser (`localStorage`, Schlüssel `sec-trainer-v1`)

## Struktur

```
index.html, manifest.json, sw.js
css/styles.css
fonts/        Carlito (SIL Open Font License)
icons/        App-Icons
js/content.js Kerninhalte (Deck-Übersicht, Cluster, Module, Szenarien, Prüfung)
js/decks/     Karten je Deck (10 Dateien)
js/storage.js Speicher, Leitner-Logik, Serie, Fehlerbox
js/app.js     Oberfläche und Routing
```

## Lokal starten

```
python3 -m http.server 8080
```

Dann `http://localhost:8080` öffnen. Für die Installation auf dem iPhone über HTTPS ausliefern (z. B. GitHub Pages), in Safari öffnen und „Zum Home-Bildschirm“ wählen.

## Update

Nach Änderungen die Cache-Version in `sw.js` erhöhen; die App lädt sich beim nächsten Start automatisch neu.

## Hinweis

Themenauswahl orientiert an der offiziellen CISSP-Outline (gültig bis 14.4.2027 und ab 15.4.2027), dem Repository jefferywmoore/CISSP-Study-Resources (Apache-2.0), dem CISO Security Glossary von pedrolastiko (MIT) sowie für das Praxis-Deck an öffentlichen Standards und Leitfäden (OWASP, MITRE ATT&CK, CIS Controls, NIST CSF 2.0, ISO/IEC 27001, BSIG/NIS2, BSI IT-Grundschutz). Lernhilfe mit eigenen Formulierungen, Stand November 2026. Verbindlich sind die jeweiligen Rechtstexte, Normen und offiziellen Prüfungsunterlagen.
