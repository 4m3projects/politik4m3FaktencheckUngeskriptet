# Technischer Prüfnachweis

[Codex], 19.11.2026. [Issue #71](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/71), [PR #72](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/pull/72). Inhaltlicher Stand zunächst in Commit `f864915` gesichert.

Tatsächlich ausgeführt und bestanden:

- Generator-Prüfmodus für `BOIqGtGuShM` und `mdo14671BPE`; beide Berichtsbestände stimmen mit den strukturierten Daten überein.
- `Test-Factcheck.ps1`: 116 Testfälle bestanden.
- `Test-Publication.ps1`: Arbeitsbaum und Git-Index geprüft; technischer Dateifilter bestanden. Das ersetzt keine inhaltliche Rechteprüfung.
- JavaScript-Tests direkt mit Node ausgeführt: Synchronisation 22, Beziehungen 20, Rhetorik 13, Faktenampel 10, Wissensdatenbank 29; insgesamt 94 bestandene Tests.
- `wissen.js pruefen`: gültiger Bestand ohne offene technische Prüfaufträge. `wissen.js aenderung --basis origin/main`: keine bestehenden Wissenseinträge überschrieben.
- `git diff --cached --check`: keine Formatfehler.

Lokale Einschränkungen: Der Node-Testaufruf mit Prozessisolation scheiterte an einer Prozessstartbeschränkung; die Tests liefen anschließend direkt über Node erfolgreich. Der automatische Beziehungs-Browsertest startete nicht: zunächst fehlte das separate Playwright-Browserpaket, anschließend brach der Start des bereits installierten Chrome ab. Er wird daher **nicht als bestanden** bezeichnet. Die Browserauslieferung wird gesondert über die tatsächlich veröffentlichte Seite kontrolliert; das ist kein Ersatz für den gesamten automatischen Browsertest.

Keine Änderungen an Seitenlogik, Ampelregeln oder Workflows. Keine fremden Rohuntertitel, Medien oder Quellenkopien im Git-Beitrag. Technische Tests bestätigen keine sachliche Vollständigkeit; die offenen Sachprüfungen stehen im [Review](review.md).
