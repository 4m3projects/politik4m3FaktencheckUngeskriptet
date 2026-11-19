# Dauerhafte Agentenregel: Wissensdatenbank nutzen, verknüpfen und Fehler systemweit korrigieren

Diese Datei ist eine **allgemeine Arbeitsanweisung für alle KI-Agenten** (Codex, Claude, ChatGPT und weitere). Sie gilt bei **jeder** neuen oder geänderten Faktencheck-Recherche, unabhängig von einzelnen Issues. Architektur und Datenmodell: [WISSENSDATENBANK.md](WISSENSDATENBANK.md). Die Regeln in [AGENTEN_PRUEFSTATUS.md](AGENTEN_PRUEFSTATUS.md), [AGENTEN_RECHERCHE.md](AGENTEN_RECHERCHE.md), [AGENTEN_RHETORIK.md](AGENTEN_RHETORIK.md) und [AGENTEN_REAKTIONSABGLEICH.md](AGENTEN_REAKTIONSABGLEICH.md) gelten unverändert weiter.

Erstellt von: Claude, auf Auftrag von Jens (19.11.2026).

## 1. Pflichtablauf bei jeder Recherche

1. **Behauptung bestimmen.** Eigene, präzise Formulierung mit Zeitbezug und Geltungsbereich.
2. **Gezielt suchen.** `node scripts/wissen.js suche "<Behauptung>"`. Welche weiteren Wissensdatenbanken für das Thema zuständig sind, zeigt `node scripts/wissen.js quellen --thema <Thema-ID>`; deren Repos klonen und mit `--repo KÜRZEL=PFAD` einbinden (zum Beispiel `--repo HP=../politik4m3Facktencheck`). Mit zwei bis drei unterschiedlichen Formulierungen suchen. Es wird nicht die ganze Datenbank verarbeitet.
3. **Vorhandenes lesen.** Treffer (Einträge und Aussagen) mit Urteil, Begründung, Quellen und Prüfdatum ansehen.
4. **Übertragbarkeit und Aktualität prüfen.** Gleicher Zeitbezug? Gleicher Ort, gleiche Größe, gleiche Bedingung? `validity.validUntil`, `checkedOn` und offene Korrekturvorgänge beachten. Ähnliche Wörter machen zwei Aussagen nicht gleich.
5. **Weiter recherchieren.** Die Originalquellen früherer Prüfungen selbst öffnen und lesen, dazu eigene Recherche nach den bestehenden Regeln (mindestens zwei Durchgänge vor „Nicht ausreichend belegbar“).
6. **Bewerten** nach den bestehenden sechs Kategorien und Prüfstatus. Nichts an Kategorien, Ampel oder Rhetorik-Ebene ändert sich durch die Wissensdatenbank.
7. **Verknüpfen.** Neue Aussagen Themen zuordnen (`faktenchecks/<ID>/themen.json`). Gibt es einen passenden Wissenseintrag, die Aussage mit begründeter `contextNote` verknüpfen; kommt eine Behauptung in mehreren Videos vor, einen Eintrag anlegen (Abschnitt 3). Anschließend `node scripts/wissen.js pruefen`.

Im Feld `research.rounds[].strategy` einer Aussage vermerken, welche Einträge oder früheren Aussagen herangezogen wurden.

## 2. Was als Beleg zählt

- **Eine frühere KI-Bewertung ist kein Beweis.** Belegt wird ausschließlich mit den gelesenen Originalquellen und ihrer korrekten Auslegung.
- Mehrere Bewertungen derselben Quelle zählen als **eine** Quelle. Eigene Faktencheck-Seiten sind nie Quelle eines Wissenseintrags (der Validator weist das ab).
- Übernommene Teilbefunde werden als übernommen gekennzeichnet, nicht als neue Recherche ausgegeben.

## 3. Themen und Wissenseinträge pflegen

- Themen nur aus dem **Inhalt** (Aussagen, Fundstellen) zuordnen, nicht aus dem Titel. Vor einem neuen Thema prüfen, ob es schon ein Thema oder einen Alias gibt (`node scripts/wissen.js themen`). Hauptthemen heißen möglichst mit einem Wort. Unterthemen nur bei echtem Mehrwert. Ähnliche Themen zusammenführen (`mergedInto`), nicht löschen.
- Relevanz je Video: `Schwerpunkt`, `Behandelt` oder `Erwähnt`. Eine beiläufige Erwähnung ist `Erwähnt` und zählt nicht für die öffentliche Kategorie.
- Ein Wissenseintrag hat eine eigene, präzise Behauptung, den zeitlichen und sachlichen Gültigkeitsbereich, Originalquellen und für jede Verknüpfung eine Begründung. `gleichwertig` nur, wenn Inhalt, Zeitbezug und Geltungsbereich übereinstimmen; sonst `teilaspekt`, `verwandt` oder `widerspricht`.
- `node scripts/wissen.js kandidaten` liefert Paare ähnlicher Aussagen aus verschiedenen Videos. Das sind nur Vorschläge.

## 4. Fehler erkennen und systemweit korrigieren

Stellt ein Agent fest, dass eine frühere Bewertung möglicherweise falsch ist, eine Quelle falsch gelesen wurde oder neue Erkenntnisse widersprechen, wird das **nicht ignoriert**:

1. **Melden.** Korrekturvorgang `wissen/korrekturen/<Kürzel>-C0001.json` mit Status `Gemeldet` anlegen (Auslöser, erste Hinweise) und in einem Issue sichtbar machen.
2. **Betroffene finden.** `node scripts/wissen.js betroffen --aussage <ID>` bzw. `--quelle <URL>` oder `--eintrag <ID>`. Das findet Aussagen mit derselben Quelle in allen Videos, verknüpfte Aussagen und Einträge, die über `dependsOn` auf derselben Annahme beruhen. Ergebnis in `affected` übernehmen; nicht Betroffenes nicht anfassen.
3. **Prüfen.** Originalquellen neu lesen, neue Beweislage dokumentieren (`evidence`). Ein bloßer Widerspruch zwischen zwei KI-Ergebnissen reicht nicht.
4. **Entscheiden.** `Bestätigt` oder `Verworfen` mit `decision`. **Menschliche Freigabe durch Jens** ist nötig, wenn mehr als `corrections.maxClaimsWithoutApproval` (derzeit 3) Aussagen betroffen sind, das Urteil eines Wissenseintrags geändert wird oder die Beweislage unklar ist. Kleine, eindeutige Fälle (zum Beispiel ein nachweislicher Rechen- oder Zuordnungsfehler) darf eine benannte Regel entscheiden (`decision.by = "Regel:<Name>"`).
5. **Umsetzen.** Aussagen in `aussagen.json` korrigieren (stabile IDs, Vermerk in `migration.assessmentChange` mit Datum, Agent und Korrektur-ID), Einträge mit neuer Revision und `previous` in der Historie. In `changes` jede Änderung mit vorher/nachher eintragen, Status `Umgesetzt`. Artefakte neu erzeugen (`[regenerate]`). Statistik, Ampel, Themenseiten und Empfehlungen folgen automatisch.
6. **Faktenlage geändert ≠ Fehler.** War eine Aussage zu ihrem Zeitpunkt richtig, bleibt ihre Bewertung. Der Eintrag erhält `validity.validUntil`, Status `Abgelöst` und einen Nachfolger; der Validator verbietet Urteilsänderungen an Videoaussagen bei dieser Art.

**Keine massenhafte Änderung produktiver Bewertungen ohne Freigabe.** Alte Bewertungen werden nie spurlos überschrieben.

## 5. Zusammenarbeit mehrerer Agenten

- Vor Arbeiten an einem Eintrag offene Issues/PRs prüfen und im Eintrag `lock` setzen (`agent`, `since`, `ref` mit Issue/PR). Fremde Sperren respektieren; ältere als `lockMaxAgeDays` meldet `pruefen` als Prüfauftrag.
- Jede inhaltliche Änderung erhöht `revision` um genau 1. Der Workflow prüft bei jedem PR mit `node scripts/wissen.js aenderung`, dass niemand einen neueren Stand überschrieben oder die Historie verändert hat.
- Herkunft bleibt nachvollziehbar: `linkedBy`, `history[].agent`, Commit-Kennzeichnung [Claude]/[Codex]/[ChatGPT].

## 6. Pflichtprüfungen vor jedem PR

`node scripts/wissen.js pruefen` (Fehler beheben, Prüfaufträge beachten), `node --test site/wissen-test.js` und die bestehenden Tests. Prüfaufträge wie „Abweichung“ (Eintrag und gleichwertige Aussage verschieden bewertet) werden geklärt oder als Korrekturvorgang gemeldet, nie stillschweigend angeglichen.
