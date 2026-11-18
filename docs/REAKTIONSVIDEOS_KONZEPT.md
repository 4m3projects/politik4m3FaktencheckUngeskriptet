# Konzept: Originalinterviews, Reaktionen und Meta-Faktenchecks

Status: Konzept vom 18.11.2026. Umgesetzter Stand (Issue #4): [REAKTIONSVIDEOS.md](REAKTIONSVIDEOS.md).

## Ziel
Die Plattform prüft unabhängig und nachvollziehbar sowohl Aussagen in Interviews bei ungeskriptet als auch deren Behandlung durch externe Reaktionsvideos, journalistische Analysen und Faktenchecks. Zustimmung und Kritik werden mit demselben Verfahren geprüft. Kein offizielles Projekt von Ben, Alfred oder Sinan.

## Datenmodell (Erweiterungsvorschlag)
- `videos`: YouTube-ID, Titel, Kanal, Datum, Typ (`original`, `faktencheck`, `kritische_reaktion`, `zustimmende_reaktion`, `gemischte_reaktion`), Arbeitsstatus, Quellen-Commit.
- `aussagen`: stabile Aussage-ID, Video-ID, Sprecher, Zeitmarke, eigene Paraphrase, Kontext, Belege/Gegenbelege, Einordnung, Bearbeitungsstatus, Prüfdatum.
- `beziehungen`: `quell_video_id`, `ziel_video_id`, `quell_aussage_id` (optional), `ziel_aussage_id` (optional), Beziehungstyp (`zitiert`, `kritisiert`, `unterstuetzt`, `korrigiert`, `widerspricht`, `bezieht_sich_auf`), Begründung und Zuordnungssicherheit.
- `reviews`: Aussage-ID, Prüfer/Agent, geprüfter Commit, unabhängige Begründung, Status, Quellen, Entscheidung. Ein unabhängiger Review darf nicht nur die Erstbewertung übernehmen.
- `korrekturen`: ursprüngliche und neue Bewertung, Grund, Quelle, Zeitpunkt, Freigabe.

## Prüfverfahren
1. Originalinterview mit Sprechertrennung und prüffähigen Aussagen erfassen.
2. Reaktionsvideo unabhängig erfassen: korrekte Wiedergabe, eigene Tatsachenbehauptungen, Kritikargumente, Auslassungen, Schlussfolgerungen.
3. Aussagen durch nachvollziehbare Beziehungs-IDs verbinden; Übereinstimmung nicht nur durch Stichworte annehmen.
4. Beide Seiten gegen Primärquellen prüfen. Der ursprüngliche Faktencheck ist eine Referenz, **keine autoritative Wahrheit**.
5. Widersprüche und neue Belege können eine Neubewertung des Originals oder der Reaktion auslösen.
6. Teilanalysen klar als solche kennzeichnen; keine vollständigen Fehlerquoten aus selektierten Aussagen.

## Darstellung
- Interview-Detailseite mit eigenen Aussagen und verknüpften Reaktionen.
- Reaktions-Detailseite mit eigenem Faktencheck und Links auf relevante Originalaussagen.
- Vergleichsansicht mit Originalkontext, Reaktionsbehauptung, Belegen und begründeter Bewertung.
- Korrekturverlauf, Bearbeitungsstand und offene Prüfungen sichtbar.
- Keine pauschalen Urteile über die Kompetenz oder Person von YouTubern.

## Umsetzung
Erst die bestehende technische Übernahme und CI stabilisieren, dann Schema-Migration und UI auf separatem Branch entwickeln. Bereits laufende Analysen nicht überschreiben. Neue Videos erst auf ausdrücklichen Auftrag analysieren. Keine fremden Transkripte oder Medien öffentlich einchecken.
