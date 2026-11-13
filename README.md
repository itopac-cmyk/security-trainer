# Security Trainer

Progressive Web App zum täglichen Lernen von Security-Begriffen **und** -Konzepten – als Karteikarten mit Erklärungen, interaktiven Konzept-Modulen, Praxis-Szenarien und Prüfungsmodus.

## Inhalte

| Bereich | Umfang |
|---|---|
| Decks | 8 (Grundlagen, Kryptografie, CISM, CISSP, CRA, MVO, OT/IEC 62443, Decision-Modelle) |
| Karten | 256 (149 Begriffe, 107 Konzepte) |
| Konzept-Module | 9 mit Theorie und 54 Tap-Übungen (Auswahl, Zuordnen, Reihenfolge) |
| Szenarien | 8 mit 35 Entscheidungsfragen und Begründungen |
| Prüfungspool | 112 Fragen, Schnelltest (10 / 6 min) und Vollprüfung (20 / 12 min), Bestehensgrenze 80 % |

## Funktionen

- **Heutiger Tagesmix**: 15–20 Karten aus allen Decks, fällige Karten zuerst, dazu neue Begriffe und Konzepte
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

Lernhilfe mit eigenen Formulierungen. Verbindlich sind die jeweiligen Rechtstexte, Normen und offiziellen Prüfungsunterlagen.
