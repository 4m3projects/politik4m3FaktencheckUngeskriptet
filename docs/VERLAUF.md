# Verlauf (Seite „Verlauf“)

Die Seite `#/verlauf` zeigt jedes Video genau einmal, sortiert nach seiner letzten Änderung. Bei jeder inhaltlichen Änderung rutscht das Video nach oben; ältere Ereignisse stehen aufklappbar darunter, jeweils mit Link auf die Änderung auf GitHub.

## Berechnung

- Nichts wird von Hand gepflegt. `scripts/verlauf.js` liest beim Aufbau der Webseite die Git-Historie von `faktenchecks/<ID>/` auf der ersten Elternlinie von `main` (also die Stände nach jedem Merge) und schreibt `daten/verlauf.json`. Der Workflow checkt dafür die volle Historie aus (`fetch-depth: 0`).
- Je Stand werden die Daten vorher/nachher verglichen (`diffSnapshots`, Tests in `site/verlauf-test.js`):
  - neues Verzeichnis: „Video aufgenommen“ (bzw. „bereits vorhanden“, wenn es schon im ersten Commit der Versionsgeschichte lag);
  - `video.json` → `workStatus`: `In Bearbeitung` = Prüfung begonnen, `Teilbestand geprüft` = Faktencheck veröffentlicht, `Abgeschlossen` = abgeschlossen; ohne `workStatus` gelten die ersten erfassten Aussagen als Prüfungsbeginn;
  - `strukturiert/aussagen.json`: neue, entfernte, fertig geprüfte und erneut geöffnete Aussagen, geänderte Bewertungen (`verdict`), überarbeitete Begründungen oder Quellen;
  - `rhetorik.json`, `themen.json`, übrige Angaben in `video.json` sowie Berichte (Markdown).
- JSON wird inhaltlich verglichen; reine Formatänderungen erzeugen kein Ereignis. Das wichtigste Ereignis eines Stands ist die Überschrift (Reihenfolge in `KINDS`).
- Datum ist das Commit-Datum des Stands auf `main` (Merge-Zeitpunkt), angezeigt in deutscher Zeit.

Lokal ansehen: `node scripts/verlauf.js zeigen`.
