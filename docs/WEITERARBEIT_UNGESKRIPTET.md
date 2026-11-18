# Weiterarbeit ausschließlich im Ungeskriptet-Repository

Stand: 18.11.2026

## Entscheidung
Das ursprüngliche Repository `4m3projects/politik4m3Facktencheck` wird vorerst **nicht verändert**. Die weitere technische Entwicklung und die Überprüfung von Originalinterviews sowie Reaktionen erfolgen im neuen Repository `4m3projects/politik4m3FaktencheckUngeskriptet`.

## Übernommene Videos
- `mlxFA9T88I0`
- `mdo14671BPE`

Alle 61 im Quellrepository unter `faktenchecks/` gelisteten Dateien sind im aktuellen Importbranch vorhanden. Bei `mlxFA9T88I0/strukturiert/aussagen.json` unterscheiden sich die Blob-SHAs; die Inhalte konnten über die verfügbare Schnittstelle wegen Dateigröße nicht vollständig verglichen werden. **Nicht ungeprüft überschreiben.**

## Nächste technische Aufgaben
1. Bestehenden Draft-PR #1 auf CI-Ergebnisse und Datenkonsistenz prüfen.
2. Webseite und Build-Workflow für das neue Repository prüfen und erforderliche Korrekturen auf dem Arbeitsbranch vornehmen.
3. Originalinterviews und Reaktionsvideos mit stabilen Referenzen verknüpfen (siehe `docs/REAKTIONSVIDEOS_KONZEPT.md`).
4. Die beiden importierten Video-Arbeitsstände unabhängig von späteren Änderungen am alten Repository weiterführen.
5. Weitere Videos und gegebenenfalls aktualisierte Quelldaten erst nach ausdrücklichem Auftrag importieren.

Keine automatischen Änderungen am alten Repository und kein Merge nach `main` ohne ausdrückliche Freigabe.
