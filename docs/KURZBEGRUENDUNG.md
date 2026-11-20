# Kurzbegründung (`shortReason`)

Regel von Jens (20.11.2026, gilt für alle drei Faktencheck-Seiten): Wer die Aussagenliste überfliegt, soll schon im **zugeklappten** Zustand sehen, *warum* eine Aussage nicht oder nur teilweise stimmt. Die ausführliche Begründung, Quellen und Zuordnung stehen weiter beim Aufklappen.

## Feld

`claims[].shortReason` in `strukturiert/aussagen.json`, direkt nach `reason`:

```json
"verdict": "Widerlegt",
"reason": "Deutlich zu niedrig. Laut Kostenstudie … (vollständige Begründung)",
"shortReason": "Deutlich zu niedrig: Eine typische neue Onshore-Anlage kostet laut Kostenstudie etwa 7 bis 10 Mio. Euro."
```

## Pflicht und Form

- **Pflicht** bei den Bewertungen `Widerlegt`, `Teilweise belegt`, `Irreführend / Kontext fehlt` und `Nicht ausreichend belegbar`. Bei `Belegt`, `Meinung / Prognose` und `Nicht überprüfbar` freiwillig; die Ampelfarbe sagt dort meist genug.
- Nur bei abschließend eingeordneten Aussagen (Status `Abgeschlossen` oder `Nicht überprüfbar`), nie bei `Offen` oder `In Bearbeitung`.
- **Ein Satz, höchstens 200 Zeichen, keine Zeilenumbrüche**, nicht identisch mit `reason`.
- Inhalt: die Richtigstellung bzw. der entscheidende Grund, möglichst mit der korrekten Zahl oder Tatsache („Tatsächlich …“, „Belegt ist …, nicht …“). Das Urteil selbst nicht wiederholen, es steht als Abzeichen daneben.
- **Nur eine Verdichtung der bestehenden Begründung.** Keine neuen Tatsachen, Zahlen oder Quellen, die nicht in `reason` bzw. den zugeordneten Quellen stehen. Wird die Begründung geändert, die Kurzbegründung im selben Schritt anpassen.
- **Kein Widerspruch zur Kategorie:** Eine widerlegte oder irreführende Aussage beginnt nicht mit „Stimmt“, eine belegte nicht mit „Falsch“. Die Prüfung erkennt nur grobe Fälle; die inhaltliche Stimmigkeit verantwortet der Agent.
- Keine Zitate aus dem Video oder aus Quellen (Rechteregeln in AGENTS.md).

## Anzeige

In der Ansicht „Video mit Prüfung“ steht die Kurzbegründung unter dem Prüfgegenstand, also ohne Aufklappen sichtbar; der aufklappbare Teil heißt dann „Ausführliche Begründung, Quellen und Zuordnung“. Die Aussagekarten der Videoseite zeigen weiterhin die vollständige Begründung.

## Prüfung

`scripts/Factcheck-Common.ps1` prüft Form und Stimmigkeit, sobald das Feld vorhanden ist (`Assert-FactcheckShortReason`). Die Pflicht für den aktuellen Bestand prüft `Build-Factcheck.ps1` (auch mit `-Check`, also in der Webseiten-CI) über `Assert-FactcheckShortReasonComplete`; historische Referenzstände ohne das Feld bleiben gültig. Regressionstest: `scripts/Test-Factcheck.ps1`, Fall „Kurzbegruendung“.

Das Ergänzen einer Kurzbegründung ist keine inhaltliche Überarbeitung: Prüfstichtag (`scope.asOf`) und Bewertung bleiben unverändert; die Seite „Verlauf“ (`scripts/verlauf.js`) zählt sie nicht als überarbeitete Aussage.
