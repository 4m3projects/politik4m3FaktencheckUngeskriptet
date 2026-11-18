# Prüfprotokoll

[Codex] · 18.11.2026 · Auftrag #5. Inhaltliche Grenzen stehen in [README.md](README.md) und [review.md](review.md).

## Abgrenzung

Eigener Branch `codex/alfred-luening-analyse`, separater Worktree, Ausgangscommit `61d7cca135132c178a07b1e5cb8872eb1cc37e51`. Neue Dokumentation und ein neues Validierungsskript. Keine Änderung an `site/`, Workflows, Originaldaten oder Claudes Branch. Koordinationshinweise in Issues #4/#5. Der vorläufige JSON-Austauschblock steht in Markdown, weil der aktuelle Publikationsfilter neue JSON-Dateien an dieser Stelle nicht zulässt; keine Erweiterung des Filters im laufenden Auftrag von Claude.

Der neue Prüfaufruf lautet `pwsh -File scripts/Test-AlfredReview.ps1`. Er prüft die realen Aussage-/Quellenreferenzen, Zeitbereiche, lokalen Dokumentationslinks und die Kennzeichnung als vorläufig; er ist im bestehenden Workflow noch nicht eingebunden. Inhaltliche Wahrheit und Quelleninhalte werden dadurch nicht automatisch geprüft.

## Ausführung

Lokal ausgeführt und bestanden:

- `Test-AlfredReview.ps1`: 30 Prüfeinträge, 20 Quellenverweise (einschließlich zwei nicht lesbarer Rechtstexte), 38 Originalverweise; lokale Links, IDs, Zeitgrenzen und vorläufiger Status geprüft.
- `Test-Publication.ps1`: Arbeitsbaum mit 94 Dateien und Git-Index akzeptiert; nach dem Vormerken erneut geprüft.
- `Test-Factcheck.ps1`: 105 Testfälle bestanden.
- `Build-Factcheck.ps1 -Check`: beide vorhandenen Videos ohne Änderung der Artefakte geprüft.
- `node --test site/sync-test.js`: 22 Tests bestanden.
- `git diff --cached --check`: nach Korrektur einer überzähligen Leerzeile bestanden.

Die neue Validierung fand zunächst einen zu weit aufsteigenden relativen Dokumentationslink; dieser wurde korrigiert und erneut geprüft. Es werden keine fehlgeschlagenen ersten Läufe als Erfolg ausgegeben.

Die während der Bearbeitung nach `main` übernommene Änderung aus PR #6 (`54e6d98`) wird in den Codex-Branch einbezogen. Der inhaltliche Original-Vergleichsstand bleibt der oben dokumentierte Commit. Keine Live-Webseitenänderung in diesem Beitrag; ein lokaler Browsertest und ein neuer Pages-Deploy werden hier nicht als ausgeführt behauptet. Der bestehende Workflow prüft den Draft-PR separat, veröffentlicht dessen Inhalt aber nicht.

Für die bestehenden Regressionen wurden ausschließlich Git-Referenzobjekte aus dem Schwesterprojekt geladen, wie im vorhandenen Pages-Workflow vorgesehen. Dabei wurde keine weitere Videoauswertung in den Arbeitsbaum importiert.
