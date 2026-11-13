# Security Trainer

Progressive Web App zum täglichen Lernen von Security-Begriffen **und** -Konzepten – als Karteikarten mit Erklärungen, interaktiven Konzept-Modulen, Praxis-Szenarien und Prüfungsmodus.

## Inhalte

| Bereich | Umfang |
|---|---|
| Decks | 9 (Grundlagen, Kryptografie, CISM, CISSP, CRA, MVO, OT/IEC 62443, Decision-Modelle, CISO-Glossar) |
| Cluster | 107 – CISSP nach den 8 CBK-Domänen, CISO-Glossar nach NIST CSF 2.0 (Govern bis Recover) |
| Karten | 526 (299 Begriffe, 227 Konzepte) |
| Konzept-Module | 12 mit Theorie und 72 Tap-Übungen (Auswahl, Zuordnen, Reihenfolge) |
| Szenarien | 11 mit 47 Entscheidungsfragen und Begründungen |
| Prüfungspool | 178 Fragen, Schnelltest (10 / 6 min) und Vollprüfung (20 / 12 min), Bestehensgrenze 80 % |

## Funktionen

- **Heutiger Tagesmix**: 15–20 Karten aus allen Decks, fällige Karten zuerst, dazu neue Begriffe und Konzepte
- Deck-Seiten mit Clustern: einzeln trainierbar, inklusive verknüpfter Karten aus anderen Decks
- Suche über alle Karten (auch englische Fachbegriffe und Synonyme)
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
js/content.js Lerninhalte
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

Themenauswahl orientiert an der offiziellen CISSP-Outline (gültig bis 14.4.2027 und ab 15.4.2027), dem Repository jefferywmoore/CISSP-Study-Resources (Apache-2.0) und dem CISO Security Glossary von pedrolastiko (MIT). Lernhilfe mit eigenen Formulierungen, Stand November 2026. Verbindlich sind die jeweiligen Rechtstexte, Normen und offiziellen Prüfungsunterlagen.
