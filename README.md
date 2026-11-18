# Politik4M3 Faktencheck – Ungeskriptet

Unabhängiges, quellenorientiertes Faktencheck-Projekt zu öffentlich zugänglichen Interviews des YouTube-Kanals **ungeskriptet**. Dies ist ein eigenständiges Projekt von Politik4M3, keine offizielle Zusammenarbeit mit Ben, ungeskriptet, Alfred oder Sinan.

## Ziel
Wir prüfen nachprüfbare Tatsachenbehauptungen möglichst fair und nachvollziehbar. Richtige Aussagen werden genauso dokumentiert wie falsche, irreführende, unbelegte oder nicht entscheidbare Aussagen. Meinungen und Werturteile sind keine Tatsachenbehauptungen. Gastgeber, Gäste und zitierte Dritte werden getrennt zugeordnet. Eine Aussage darf nicht allein wegen ihres Sprechers abgewertet werden.

## Status
Technisches Grundgerüst aus [Politik4M3 Faktencheck](https://github.com/4m3projects/politik4m3Facktencheck) übernommen. **Noch keine Videos oder Auswertungen importiert.** Skripte und Dokumentation stammen aus dem Schwesterprojekt und müssen vor produktivem Einsatz auf Altpfade, feste Video-IDs, Abhängigkeiten und Testannahmen geprüft werden. Kein erfolgreich durchgeführter Test wird behauptet.

## Technik
- `scripts/Import-YouTubeTranscript.ps1`: private Arbeitsgrundlage außerhalb des Repositories erfassen
- `scripts/Build-Factcheck.ps1`: strukturierte Daten zu Berichten/Statistik aufbereiten
- `scripts/Test-Factcheck.ps1`, `scripts/Test-Publication.ps1`: Prüfungen
- `docs/STRUKTURIERTE_DATEN.md`: Datenmodell
- `docs/VEROEFFENTLICHUNG.md`: Publikationsgrenzen

Es werden keine fremden Transkripte, Untertitel, Medien oder Rohdaten öffentlich eingecheckt.

## Nächste Schritte
1. Codex/Claude prüfen die übernommenen Skripte auf allgemeine Nutzbarkeit ohne bestehende Videodaten.
2. Tests auf einem separaten Branch ausführen und fehlende Tests ergänzen.
3. Statische Startseite für GitHub Pages mit dem Hinweis „Noch keine Faktenchecks veröffentlicht“ vorbereiten.
4. Später einen **fertiggestellten und freigegebenen** Faktencheck aus dem Schwesterprojekt anhand der strukturierten Daten kontrolliert migrieren. Nicht die Rohtranskripte oder ungesicherten Arbeitsstände übernehmen.
5. Perspektivisch Mehrpersonen-Review, transparenten Korrekturprozess und exportierbare Rechercheübersichten für Videos ergänzen.

Siehe [AGENTS.md](AGENTS.md) und [Projektplan](docs/PROJEKTPLAN.md).
