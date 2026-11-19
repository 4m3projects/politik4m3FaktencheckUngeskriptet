# Themen-Wissensdatenbank mit gemeinsamer Recherche und Fehlerkorrektur

Erstellt von: Claude, auf Auftrag von Jens (19.11.2026). Status: Schritte 1–3 und 5 umgesetzt (Datenmodell und Werkzeug, Themen der vorhandenen Videos, öffentliche Themenseiten, Agentenregel `AGENTEN_WISSEN.md`); Schritte 4, 6 und 7 folgen.

## 1. Ausgangslage (Bestandsaufnahme)

| Baustein | Heute | Bedeutung für die Wissensdatenbank |
| --- | --- | --- |
| `faktenchecks/<ID>/strukturiert/aussagen.json` (Schema 2) | Einzige gepflegte Quelle je Video: Aussagen mit stabiler ID (`<Video-ID>-A0001`), Art, Status, Urteil (6 Kategorien), Begründung, Quellen, Fundstellen mit Zeitmarken, Beziehungen `korrigiert`/`widerspricht`, optional `research`. Validator in `scripts/Factcheck-Common.ps1` lehnt unbekannte Felder ab; Datei ist in beiden Repos byte-gleich. | Die Aussagen sind bereits die zentrale, überprüfbare Einheit. Die Wissensdatenbank **verweist** auf sie und kopiert keine Bewertung. Das Schema 2 bleibt unverändert. |
| `statistik.json`, Berichte | Werden aus `aussagen.json` erzeugt (`Build-Factcheck.ps1`, Workflow `regenerate.yml`). | Eine korrigierte Aussage korrigiert Statistik und Berichte automatisch beim Neuerzeugen. |
| Faktenampel `site/ampel.js` | Nur berechnet, nie gespeichert. | Wird nach einer Korrektur automatisch neu berechnet. Die Wissensdatenbank setzt keine Ampel. |
| `rhetorik.json` neben `video.json` | Zweite Ebene, eigenes Prüfmodul `site/rhetoric.js` mit Node-Tests. | Vorbild für die neue Ebene: eigene Datei neben `video.json`, eigenes Modul, keine Rückwirkung auf Faktenbewertungen. |
| `faktenchecks/beziehungen.json` | Original ↔ Reaktion, Aussage-Verknüpfungen mit Begründung. | Bleibt. Wissenseinträge verknüpfen zusätzlich Aussagen **verschiedener** Videos, die dieselbe Behauptung enthalten. |
| Agentenregeln `docs/AGENTEN_*.md` | Prüfstatus, Recherche (≥ 2 Durchgänge, Feld `research`), Rhetorik, Reaktionsabgleich (Korrekturen am Original mit Verlauf). | Die neue Pflichtregel `AGENTEN_WISSEN.md` baut darauf auf und ersetzt keine davon. |
| Veröffentlichung | Statische GitHub-Pages-Seite, keine Datenbank, kein Server, keine Fremdbibliotheken; `Test-Publication.ps1` erlaubt nur bestimmte Pfade. | Die Wissensdatenbank besteht aus JSON-Dateien im Repo. Git ist die Versionsverwaltung, Pull Requests sind die Freigabe. |

Bestand am 19.11.2026: 7 Videos, 826 Aussagen. Es gibt noch keine Themenzuordnung.

## 2. Architekturentscheidungen

**E1 – Dateien statt Datenbank.** Wie bisher: JSON im Repository, Prüfung per Node-Test im Workflow, Darstellung statisch. Begründung: keine laufenden Kosten, jede Änderung über Git versioniert und per PR prüfbar, Agenten ohne Zugangsdaten arbeitsfähig. Für Tausende Videos reicht das: Die Webseite lädt ein vorberechnetes, kompaktes Wissensverzeichnis statt aller Videodaten.

**E2 – Aussagen bleiben die Wahrheitsquelle.** Ein Wissenseintrag enthält ein eigenes Prüfergebnis mit Originalquellen, aber die Bewertung einer Videoaussage steht weiter nur in `aussagen.json`. Verknüpfungen werden nicht automatisch angeglichen; Abweichungen werden als Prüfauftrag gemeldet (siehe 6).

**E3 – Schema 2 bleibt unverändert.** Themenzuordnungen stehen in einer eigenen Datei `faktenchecks/<ID>/themen.json` (wie `rhetorik.json`). Dadurch müssen `Factcheck-Common.ps1` und `Test-Factcheck.ps1` nicht angefasst werden, und alle bisherigen Faktenchecks bleiben unverändert gültig.

**E4 – Projektübergreifende IDs.** Jedes Projekt hat ein Kürzel (`wissen/konfiguration.json` → `namespace`, hier `UG`, im Hauptprojekt `HP`). Einträge heißen `UG-K0001`, Korrekturen `UG-C0001`. Aussage-IDs sind über die YouTube-ID ohnehin global eindeutig. Verknüpfungen auf Aussagen im anderen Repo tragen das Feld `repo`. So können beide Repos dasselbe Format nutzen und später ohne Umbenennung an einem zentralen Ort zusammengeführt werden.

**E4a – Entscheidung von Jens (19.11.2026): erst A, später C als Ergänzung.** Jedes Projekt führt jetzt seinen eigenen Ordner `wissen/` im gleichen Format (A). Später kommt ein eigenes zentrales Repository hinzu (Arbeitstitel „Politik4M3 Wissensdatenbank“, C), in dem Agenten Wissen projektübergreifend austauschen und das über beide Webseiten auffindbar ist. Ein zentrales Ablegen im Hauptprojekt ist ausdrücklich nicht gewünscht (würde zu groß). Damit der Schritt zu C einfach bleibt, gilt schon jetzt:

- Einträge und Korrekturen tragen das Projektkürzel in der ID (`UG-…`, `HP-…`); im zentralen Repo kollidiert nichts, nichts wird umbenannt.
- Verknüpfungen auf Videoaussagen tragen `repo`, sobald die Aussage nicht im selben Repo liegt. Im zentralen Repo erhalten alle lokalen Verweise einfach das Herkunfts-Repo.
- Jeder Eintrag ist eine eigene Datei; das zentrale Repo kann Dateien unverändert übernehmen oder spiegeln.
- Prüflogik (`site/wissen.js`) und Agentenwerkzeug (`scripts/wissen.js`) sind in beiden Repos identisch und kennen kein projektspezifisches Detail außer `wissen/konfiguration.json`. Das zentrale Repo verwendet dieselben Dateien.
- Das Werkzeug durchsucht schon jetzt mehrere Repos (`--repo <Pfad>`), also genau die Arbeitsweise, die ein zentrales Repo später bündelt.
- **Mehrere Wissensdatenbanken (Ergänzung von Jens, 19.11.2026):** Neben den Projekt-Datenbanken kann es mehrere gemeinsame geben, auch themenspezifische (z. B. „Politik4M3 Wissensdatenbank Atomkraft“). Jede Wissensdatenbank ist ein Repo bzw. Ordner im selben Format mit eigenem Kürzel (2–6 Zeichen, z. B. `UG`, `HP`, `WDB`, `WATOM`). `wissen/konfiguration.json` → `knowledgeSources` listet die anderen Datenbanken mit Art (`Projekt`, `Zentral`, `Thematisch`), Repo und zuständigen Themen. `dependsOn` und `supersededBy` dürfen auf Einträge dieser Datenbanken zeigen. `node scripts/wissen.js quellen --thema atomkraft` zeigt, welche Datenbanken für ein Thema zu durchsuchen sind; `suche` bindet beliebig viele davon mit `--repo KÜRZEL=PFAD` ein und meldet nicht eingebundene.
- **Themenprojekte statt reiner Themen-Datenbanken (Präzisierung von Jens, 19.11.2026):** Ein komplexes Thema bekommt eher einen eigenen Faktencheck (z. B. „Politik4M3 Faktencheck Atomkraft“), der gezielt Videos zu diesem Thema sucht und prüft und wie jedes Projekt seine eigene Wissensdatenbank im Ordner `wissen/` hat. In `knowledgeSources` steht er als `type: "Projekt"` mit `topics: ["atomkraft"]`; Agenten anderer Projekte durchsuchen ihn dann bei Atomkraft-Behauptungen automatisch mit. Es wird jetzt kein neues Repo angelegt; das Format hält den Weg offen. Eine rein zentrale Datenbank (`Zentral`) bleibt als spätere Ergänzung möglich.
- Themen-IDs sind sprechende, projektunabhängige Pfade (`atomkraft/kosten`). Beide Projekte sollen dieselben IDs für dieselben Themen verwenden; ein zentrales Themenverzeichnis kann die beiden `themen.json` dann zusammenführen.

**E5 – Ähnlichkeit schlägt vor, Menschen/Agenten entscheiden.** Ähnliche Behauptungen werden mit einer einfachen, kostenlosen Wortähnlichkeit (normalisierte Wortstämme, Zahlen, Jaccard) gefunden, ohne KI-Aufrufe. Treffer sind Kandidaten. „Gleichwertig“ wird nur nach inhaltlicher Prüfung von Geltungsbereich, Zeitbezug und Kontext verknüpft.

**E6 – Korrekturen als eigene, versionierte Vorgänge.** Jede vermutete Fehlbewertung wird ein Korrekturvorgang `wissen/korrekturen/UG-C0001.json` mit Auslöser, Beweislage, betroffenen Einträgen, Entscheidung und den tatsächlich vorgenommenen Änderungen (vorher/nachher). Alte Bewertungen bleiben dort und in Git erhalten.

**E7 – Abgeleitete Ergebnisse werden berechnet, nicht gepflegt.** Statistik, Ampel, Themenseiten, „wiederkehrend“ und Videoempfehlungen werden aus Aussagen, Themen und Einträgen berechnet. Eine bestätigte Korrektur an der Aussage bzw. am Eintrag wirkt deshalb beim nächsten Build überall, ohne Neuanalyse aller Videos.

## 3. Datenmodell

### 3.1 `wissen/konfiguration.json`

```json
{
  "schemaVersion": 1,
  "namespace": "UG",
  "publicTopics": { "minVideos": 2, "minClaimsPerVideo": 2, "relevances": ["Schwerpunkt", "Behandelt"] },
  "recommendations": { "minDecidedFacts": 3, "maxErrorShare": 0.25 },
  "review": { "maxAgeDays": 365 },
  "corrections": { "maxClaimsWithoutApproval": 3, "lockMaxAgeDays": 7 },
  "knowledgeSources": [
    { "namespace": "HP", "name": "Politik4M3 Faktencheck (Hauptprojekt)", "type": "Projekt", "repo": "4m3projects/politik4m3Facktencheck", "topics": [] }
  ]
}
```

`minVideos` ist die konfigurierbare Mindestanzahl für eine öffentliche Kategorie (Vorschlag von Jens: 2).

### 3.2 `wissen/themen.json` – Themenverzeichnis

```json
{
  "schemaVersion": 1,
  "topics": [
    { "id": "atomkraft", "name": "Atomkraft", "level": "Hauptthema", "parent": null, "aliases": ["Kernkraft", "Kernenergie"], "description": "…", "visibility": "automatisch", "mergedInto": null, "history": [] },
    { "id": "atomkraft/kosten", "name": "Kosten", "level": "Unterthema", "parent": "atomkraft", "aliases": [], "description": "…", "visibility": "automatisch", "mergedInto": null, "history": [] },
    { "id": "atomkraft/kosten/vergleich-erneuerbare", "name": "Ist Atomkraft günstiger als erneuerbare Energien?", "level": "Fragestellung", "parent": "atomkraft/kosten", "aliases": [], "description": "…", "visibility": "automatisch", "mergedInto": null, "history": [] }
  ]
}
```

- `level`: Hauptthema (Name möglichst ein Wort), Unterthema, Fragestellung. Unterthemen nur bei echtem Mehrwert.
- `visibility`: `automatisch` (Regel aus der Konfiguration), `freigegeben` (manuell öffentlich), `intern` (manuell nicht öffentlich).
- `aliases` und `mergedInto` verhindern Doppelungen: Ein zusammengeführtes Thema bleibt als Weiterleitung erhalten, damit alte Zuordnungen gültig bleiben. Der Validator meldet gleiche Namen/Aliasse in zwei Themen.

### 3.3 `faktenchecks/<ID>/themen.json` – Themen eines Videos

```json
{
  "schemaVersion": 1,
  "videoId": "mlxFA9T88I0",
  "basis": "Zuordnung aus den erfassten Aussagen und ihren Fundstellen, nicht aus dem Titel.",
  "topics": [
    { "topic": "energie", "relevance": "Schwerpunkt", "basis": "…", "segments": [ { "startSeconds": 1200, "endSeconds": 1850, "note": "Erklärt Strompreisbestandteile mit Zahlen." } ] }
  ],
  "claims": [ { "claimId": "mlxFA9T88I0-A0084", "topics": ["energie/strompreis"] } ],
  "history": [ { "date": "2026-11-19", "agent": "Claude", "change": "Erstzuordnung." } ]
}
```

- `relevance`: `Schwerpunkt`, `Behandelt`, `Erwähnt`. Nur die ersten beiden zählen für die öffentliche Kategorie, und nur, wenn genug Aussagen des Videos dem Thema zugeordnet sind (`minClaimsPerVideo`). So zählt eine beiläufige Erwähnung nicht, und die Zuordnung beruht auf dem Inhalt, nicht auf dem Titel.
- `segments` sind Abschnitte mit Zeitstempeln für Abschnittsempfehlungen.

### 3.4 `wissen/eintraege/UG-K0001.json` – Wissenseintrag

```json
{
  "schemaVersion": 1,
  "id": "UG-K0001",
  "revision": 1,
  "claim": "Eigene, präzise Formulierung der geprüften Behauptung.",
  "topics": ["atomkraft/kosten"],
  "status": "Geprüft",
  "verdict": "Widerlegt",
  "reason": "Begründung in eigenen Worten.",
  "validity": { "asOf": "2026-11-19", "timeScope": "Stand 2025", "subjectScope": "Deutschland, Neubau", "validUntil": null },
  "checkedOn": "2026-11-19",
  "sources": [ { "id": "Q1", "title": "…", "url": "https://…", "details": "Herausgeber, Datenstand", "accessedOn": "2026-11-19", "kind": "Primärquelle" } ],
  "dependsOn": [],
  "supersededBy": null,
  "links": [ { "claimId": "mlxFA9T88I0-A0084", "repo": null, "relation": "gleichwertig", "contextNote": "Gleicher Zeitbezug und Geltungsbereich.", "linkedBy": "Claude", "linkedOn": "2026-11-19" } ],
  "lock": null,
  "history": [ { "revision": 1, "date": "2026-11-19", "agent": "Claude", "change": "Angelegt aus mlxFA9T88I0-A0084.", "previous": null } ]
}
```

- `verdict` nutzt dieselben sechs Kategorien wie die Faktenchecks. `status`: `Entwurf`, `Geprüft`, `Abgelöst` (Faktenlage hat sich geändert, Nachfolger in `supersededBy`), `Zurückgezogen` (Fehler, Begründung in `history`).
- `relation`: `gleichwertig` (sinngemäß dieselbe Behauptung mit gleichem Geltungsbereich), `teilaspekt`, `verwandt`, `widerspricht`. Nur `gleichwertig` wird mit dem Urteil der Aussage abgeglichen und zählt für „wiederkehrend“.
- `sources` sind **Originalquellen**. Verweise auf eigene Aussagen oder Einträge stehen nur in `links`/`dependsOn` und zählen nie als Beleg. Mehrere Prüfungen derselben Quelle zählen als eine Quelle (Zählung über normalisierte URL).
- `dependsOn` nennt andere Einträge, auf deren Ergebnis dieser Eintrag aufbaut (gemeinsame Annahmen). Darüber findet die Korrektur auch abhängige Einträge mit anderem Wortlaut.
- `revision` + `history`: jede Änderung erhöht die Revision und hinterlässt den vorigen Stand (`previous`: Urteil, Begründung). Das ist zusätzlich zur Git-Historie die lesbare Änderungshistorie.
- `lock`: `{ "agent": "Codex", "since": "2026-11-19", "ref": "PR #60" }` zeigt anderen Agenten, dass jemand an dem Eintrag arbeitet.

### 3.5 `wissen/korrekturen/UG-C0001.json` – Korrekturvorgang

```json
{
  "schemaVersion": 1,
  "id": "UG-C0001",
  "kind": "Fehlbewertung",
  "status": "Gemeldet",
  "reportedOn": "2026-11-19",
  "reportedBy": "Claude",
  "trigger": { "claimId": "…", "entryId": null, "description": "Neue Primärquelle zeigt …" },
  "evidence": [ { "title": "…", "url": "https://…", "accessedOn": "2026-11-19", "finding": "…" } ],
  "affected": [ { "target": "mdo14671BPE-A0042", "reason": "Gleiche Quelle S017 falsch gelesen." } ],
  "decision": null,
  "changes": [],
  "history": [ { "date": "2026-11-19", "agent": "Claude", "change": "Gemeldet." } ]
}
```

- `kind`: `Fehlbewertung`, `Quelle falsch interpretiert`, `Faktenlage geändert`, `Zuordnung falsch`.
- `status`: `Gemeldet` → `In Prüfung` → `Bestätigt` oder `Verworfen` → `Umgesetzt`.
- `decision`: `{ "by": "Jens" | "Regel:<name>", "date": "…", "basis": "…" }`. Ohne Entscheidung keine Umsetzung.
- `changes`: tatsächliche Änderungen `{ "target": "<Aussage- oder Eintrags-ID>", "field": "verdict", "before": "Belegt", "after": "Widerlegt" }`.

## 4. Öffentliche Wissensdatenbank

Neue Seiten `#/themen` (Übersicht der öffentlichen Hauptthemen) und `#/thema/<id>` mit:

1. **Belegte Tatsachen** – Aussagen bzw. Einträge mit `Belegt`, getrennt davon `Teilweise belegt` mit Hinweis, welcher Teil stimmt.
2. **Falsche oder irreführende Behauptungen** – `Widerlegt` und `Irreführend / Kontext fehlt` mit Begründung. Kennzeichnung „In n von uns geprüften Videos“, wenn ein Eintrag mit `gleichwertig` an Aussagen aus mindestens zwei Videos hängt. Bewusst nicht „weitverbreitet“.
3. **Nicht ausreichend belegte Aussagen** – `Nicht ausreichend belegbar`, ausdrücklich nicht als falsch markiert.
4. **Passende Videos und Abschnitte** – siehe 4.1.

Jeder Punkt verlinkt die ursprüngliche Videoaussage (`#/video/<ID>/aussage/<Aussage-ID>`) mit Zeitstempel und Quellen. Meinungen/Prognosen, offene und nicht überprüfbare Aussagen erscheinen nicht als Ergebnis. Nicht öffentliche Themen bleiben über die Suche auffindbar und erscheinen am Video.

### 4.1 Videoempfehlungen (transparente Regel)

Berechnet in `site/wissen.js` → `recommendations()`, je Thema und Video nur aus den Aussagen **dieses Themas**:

- mindestens `minDecidedFacts` entschiedene Tatsachenbehauptungen zum Thema (Belegt, Teilweise belegt, Irreführend, Widerlegt),
- Anteil widerlegter/irreführender darunter unter `maxErrorShare`,
- Reihenfolge: Anzahl belegter Aussagen zum Thema, dann Anzahl verschiedener Quellen.

Die Gesamtquote des Videos, Sprecher, Kanal und politische Position fließen nicht ein. Hat das Video Abschnitte (`segments`) zum Thema, wird der Abschnitt mit Zeitstempel empfohlen. Die Seite nennt zu jeder Empfehlung die Begründung in Zahlen.

## 5. Gemeinsame Wissensbasis für Agenten

Neue Pflichtregel `docs/AGENTEN_WISSEN.md` (Schritt 5) mit dem Ablauf von Jens:

1. Behauptung bestimmen. 2. `node scripts/wissen.js suche "<Behauptung>"` (sucht gezielt in Einträgen und Aussagen; weitere Wissensdatenbanken laut `quellen` mit `--repo KÜRZEL=PFAD`; keine Vollverarbeitung). 3. Vorhandene Prüfungen, Quellen, Begründungen lesen. 4. Übertragbarkeit und Aktualität prüfen (Zeitbezug, Geltungsbereich, `validUntil`, `checkedOn`). 5. Originalquellen selbst erneut öffnen und weiter recherchieren (Regeln aus `AGENTEN_RECHERCHE.md`). 6. Neue Prüfung nach den bestehenden Bewertungsregeln. 7. Ergebnis verknüpfen: neuen Eintrag anlegen oder Link ergänzen, Themen zuordnen.

Eine frühere KI-Bewertung ist kein Beweis; im Feld `research.rounds[].strategy` wird vermerkt, welche Einträge herangezogen wurden, belegt wird nur mit den gelesenen Originalquellen.

Koordination: Vor Änderungen an einem Eintrag `lock` setzen (eigener PR), offene PRs prüfen. Gleichzeitige Änderungen derselben Datei fallen in Git als Konflikt auf; `revision` muss genau um 1 steigen, sonst schlägt die Prüfung fehl.

## 6. Systemweite Fehlererkennung und Korrektur

1. **Erkennen:** automatisch durch `node scripts/wissen.js pruefen` (Abweichung Eintrag ↔ gleichwertige Aussage, veraltete Einträge, abgelaufene Gültigkeit, verwaiste Sperren) oder durch einen Agenten bei neuer Recherche → Korrekturvorgang `Gemeldet`.
2. **Betroffene finden:** `node scripts/wissen.js betroffen --quelle <URL> | --eintrag <ID> | --aussage <ID>` liefert alle Aussagen und Einträge, die dieselbe Quelle nutzen, mit dem Eintrag verknüpft sind oder über `dependsOn` darauf aufbauen, dazu betroffene Videos und Themen. Diese Liste wird in `affected` übernommen.
3. **Prüfen:** Originalquellen neu lesen. Ein bloßer Widerspruch zweier KI-Ergebnisse reicht nicht; der Validator verlangt für `Bestätigt` mindestens eine externe Quelle in `evidence` und eine Entscheidung.
4. **Korrigieren:** Aussagen in `aussagen.json` (mit Vermerk in `migration.assessmentChange`, wie bisher), Einträge mit neuer Revision. Statistik, Ampel, Themenseiten und Empfehlungen folgen automatisch.
5. **Freigabe:** Mehr als `maxClaimsWithoutApproval` betroffene Aussagen, Art `Fehlbewertung` mit geändertem Urteil eines Eintrags oder unklare Beweislage → `decision.by` muss ein Mensch sein (Jens). Kleine, eindeutige Fälle darf eine benannte Regel entscheiden.
6. **Faktenlage geändert:** Die alte Aussage bleibt richtig für ihren Zeitpunkt. Der Eintrag erhält `validity.validUntil` und `status: Abgelöst` mit Nachfolger. Der Validator verbietet bei dieser Art Urteilsänderungen an Videoaussagen.

## 7. Arbeitsschritte (je ein PR, unabhängig prüfbar)

| Schritt | Inhalt | Tests |
| --- | --- | --- |
| 1 | Datenmodell, `site/wissen.js` (Validierung, Sichtbarkeit, Themenseiten-Daten, Ähnlichkeit, Betroffenheit, Konsistenz), CLI `scripts/wissen.js`, leere Datendateien, Publikationsprüfung, Workflow | `site/wissen-test.js` |
| 2 | Themenverzeichnis und Zuordnung der 7 vorhandenen Videos aus ihren Aussagen; keine Bewertung ändert sich | Validator, Zählung öffentlicher Themen |
| 3 | Webseite: `#/themen`, `#/thema/<id>`, Themen am Video, Suche; Export `daten/wissen.json` im Build | Browser-Test, Bestandstests |
| 4 | Erste Wissenseinträge für Behauptungen, die mehrfach vorkommen (aus Schritt 2 gefundene Kandidaten) | Verknüpfung, Unabhängigkeit der Quellen |
| 5 | Pflichtregel `docs/AGENTEN_WISSEN.md`, Verweis in `AGENTS.md`, Ergänzung in `AGENTEN_RECHERCHE.md` | – |
| 6 | Korrekturablauf scharf schalten (Vorlage, Konsistenzbericht im Workflow als Hinweis, Freigaberegeln) | Korrekturweitergabe, Schutz vor Massenänderung |
| 7 | Übertragung ins Hauptprojekt (gleiches Format, Kürzel `HP`) | dieselben Tests |

Nach jedem Schritt laufen alle bisherigen Tests (Publikation, Faktencheck, Sync, Beziehungen, Rhetorik, Ampel) unverändert.

## 8. Grenzen

- Die Wortähnlichkeit erkennt keine Synonyme ohne gemeinsame Wörter; Aliasse der Themen helfen. Eine spätere, optionale Vektor-Suche würde laufende Kosten verursachen und ist nicht vorgesehen.
- Der Validator erkennt keine inhaltlich falsche Verknüpfung. „Gleichwertig“ bleibt eine redaktionelle Entscheidung mit Begründung in `contextNote`.
- Themenzuordnung bestehender Videos beruht auf den erfassten Aussagen. Nicht erfasste Teile eines Videos fehlen auch thematisch.
