# Dauerhafte Agentenregel: Umgang mit fehlenden Belegen

Diese Anweisung gilt für alle KI-Agenten (Claude, Codex, ChatGPT) in beiden Faktencheck-Projekten (Politik4M3 Faktencheck und Politik4M3 Faktencheck Ungeskriptet). Der Text ist in beiden Repositorys identisch; Änderungen immer in beiden vornehmen. Sie ergänzt [AGENTEN_PRUEFSTATUS.md](AGENTEN_PRUEFSTATUS.md) und ersetzt dort nichts. Eingeführt am 19.11.2026 (Claude) auf Wunsch von Jens.

**Grundsatz:** Ein fehlender Suchtreffer ist kein Beweis dafür, dass es keine Belege gibt. Ziel ist nicht, möglichst viele Aussagen als richtig oder falsch einzustufen, sondern möglichst viele Aussagen zuverlässig zu überprüfen. Muss eine Bewertung offenbleiben, soll nachvollziehbar sein, warum.

## 1. Zweite Recherche vor jedem „nicht belegt“

Findet ein Agent für eine überprüfbare Tatsachenbehauptung zunächst keine ausreichenden Belege, darf er sie **nicht nach einem einzigen erfolglosen Suchversuch** als `Nicht ausreichend belegbar` oder `Nicht überprüfbar` einordnen. Vorher muss er:

1. **Die erste Suchstrategie prüfen:** Waren Begriffe, Sprache, Zeitraum und Quellenart passend? Wurde nach der Aussage selbst oder nur nach einem Schlagwort gesucht?
2. **Alternative Suchbegriffe verwenden:** Synonyme, Fachbegriffe, amtliche Bezeichnungen, Abkürzungen, englische oder andere Originalsprache, Namen von Gesetzen, Behörden, Studien oder Personen.
3. **Belastbare Quellen gezielt ansteuern:** Primärquellen (amtliche Statistik, Gesetzestext in der damals geltenden Fassung, Parlamentsdokumente, Originalstudien, Geschäftsberichte, Gerichtsentscheidungen) statt nur Nachrichten- oder Suchmaschinenausschnitte.
4. **Zeit- und Sachzusammenhang beachten:** Maßstab ist der Wissensstand zum Erstelldatum des Videos. Bezugsraum, Jahr, Definition (brutto/netto, nominal/real, Bestand/Strom) klären.
5. **Indirekte, aber belastbare Prüfwege nutzen:** Lässt sich die Aussage über eine Zeitreihe, eine Gesamtzahl, eine Pflichtveröffentlichung oder eine unstrittige Folgeinformation prüfen?
6. **Widersprüchliche Quellen dokumentieren:** Unterschiede (Definition, Zeitraum, Methode, Interessenlage) benennen, nicht stillschweigend eine Quelle wählen.
7. **Transparent bleiben:** Wenn auch danach keine ausreichenden Belege gefunden wurden, das offen sagen.

Die zusätzliche Recherche bleibt **verhältnismäßig**: In der Regel genügt eine zweite, gezielt anders angelegte Recherche. Niemand muss endlos suchen, aber nach einem einzigen Versuch aufzugeben ist unzulässig.

**Fehlender Zugang bleibt kein Ergebnis** (siehe [AGENTEN_PRUEFSTATUS.md](AGENTEN_PRUEFSTATUS.md)): Konnte eine Quelle aus der Arbeitsumgebung nicht abgerufen werden oder fehlte die Zeit, bleibt die Aussage `Offen`.

## 2. Vier Arten offener Bewertungen (intern unterschieden)

Die vier Fälle werden **intern** im optionalen Feld `research.gap` unterschieden. Auf der Webseite entstehen dadurch **keine neuen Bewertungskategorien**: Es bleibt bei den sechs Bewertungen und den vier Prüfstatus.

| Fall | `research.gap` | Status / Bewertung | Bedeutung |
| --- | --- | --- | --- |
| A | `Quellenlage unzureichend` | `Abgeschlossen` + `Nicht ausreichend belegbar` | Prüfbar; es wurden einschlägige Quellen gefunden und gelesen, sie reichen aber für keine belastbare Bewertung. |
| B | `Recherche ohne ausreichendes Ergebnis` | `Abgeschlossen` + `Nicht ausreichend belegbar` | Prüfbar; trotz angemessener (mindestens zweiter) Recherche keine geeigneten Quellen gefunden. **Das heißt ausdrücklich nicht, dass es keine gibt.** |
| C | `Derzeit nicht überprüfbar` | `Nicht überprüfbar` | Die nötigen Informationen sind nicht öffentlich, fehlen oder sind derzeit nicht zuverlässig prüfbar. |
| D | `Kein überprüfbarer Tatsachenkern` | `Abgeschlossen` + `Meinung / Prognose` | Meinung, Wertung oder subjektive Einschätzung ohne eindeutig prüfbaren Tatsachenkern. |
| – | `null` | `Offen` / `In Bearbeitung` | Noch nicht (fertig) geprüft. Das ist kein Ergebnis und keiner der Fälle A–D. |

Fälle A und B brauchen **mindestens zwei dokumentierte Recherchedurchgänge** (`research.rounds`), konkrete nächste Prüfschritte in `openQuestions` und eine Angabe, welche Informationen fehlen (`research.missingInformation`). Der Validator erzwingt das.

## 3. Positive Ergebnisse sind vollwertige Ergebnisse

Ein Faktencheck soll nicht nur Fehler finden, sondern auch zutreffende Aussagen erkennen und dokumentieren. **Eine belegte Aussage ist ein vollwertiges Rechercheergebnis** und wird genauso sorgfältig erfasst, begründet und mit Quellen versehen wie eine widerlegte.

- Gezielt nach Belegen **und** Gegenbelegen suchen, nicht nur nach Fehlern.
- Die sachliche Bewertung (sechs Kategorien) bleibt von allen Zusatzkriterien getrennt: Rhetorik-Hinweise ([AGENTEN_RHETORIK.md](AGENTEN_RHETORIK.md)) und die berechnete Faktenampel ([AMPEL.md](AMPEL.md)) verändern keine Einzelbewertung und werden nicht vermischt.
- Keine Einstufung ändern, um eine Ampelfarbe, eine Quote oder ein „ausgewogenes“ Bild zu erreichen.

## 4. Recherche nachvollziehbar dokumentieren: Feld `research`

Jede Aussage in `aussagen.json` kann ein optionales Objekt `research` tragen. Bei **neuen oder geänderten** Einordnungen als `Nicht ausreichend belegbar` oder `Nicht überprüfbar` ab dem 19.11.2026 ist es Pflicht; bei anderen Bewertungen ist es erwünscht, wenn eine Nachrecherche stattfand. Bestehende Daten ohne das Feld bleiben gültig.

```json
"research": {
  "gap": "Recherche ohne ausreichendes Ergebnis",
  "confidence": "Mittel",
  "rounds": [
    { "date": "2026-11-19", "agent": "Claude", "strategy": "Was und wo gesucht wurde (eigene Worte).", "sourceIds": ["S001"], "result": "Was dabei herauskam." },
    { "date": "2026-11-19", "agent": "Claude", "strategy": "Zweiter, anders angelegter Versuch.", "sourceIds": [], "result": "Keine geeignete Quelle gefunden." }
  ],
  "missingInformation": "Welche Information für eine Bewertung fehlt.",
  "conflicts": null
}
```

| Feld | Inhalt | Beantwortet |
| --- | --- | --- |
| `gap` | Fall A–D oder `null` (siehe Abschnitt 2) | Warum offen? |
| `confidence` | `Hoch`, `Mittel` oder `Niedrig`: Sicherheit der Einordnung, nicht der Aussage | Wie sicher ist die Einordnung? |
| `rounds` | Tatsächlich durchgeführte Recherchedurchgänge mit Datum, Agent, Suchstrategie, geprüften Quellen-IDs und Ergebnis | Welche Quellen wurden geprüft? |
| `missingInformation` | Text oder `null`; Pflicht bei A, B und C | Welche Informationen fehlen? |
| `conflicts` | Text oder `null`; beschreibt Widersprüche zwischen mindestens zwei zugeordneten Quellen | Wo widersprechen sich Quellen? |
| `openQuestions` (bestehend) | Konkrete nächste Prüfschritte; Pflicht bei A, B, C | Welche weitere Recherche könnte helfen? |
| `reason` (bestehend) | Eigene Begründung | Warum diese Einordnung? |

**Validatorregeln** (`scripts/Factcheck-Common.ps1`, identisch in beiden Repositorys):

- `gap` passt zu Status und Bewertung wie in Abschnitt 2; Belegt, Teilweise belegt, Irreführend und Widerlegt haben `gap: null`.
- A und B: mindestens zwei Durchgänge, `missingInformation` und `openQuestions` gefüllt. C: `missingInformation` gefüllt.
- Jede Quellen-ID in einem Durchgang existiert im Quellenverzeichnis. Hat eine Aussage Durchgänge, muss jede ihr zugeordnete Quelle (`sourceRefs`) in mindestens einem Durchgang vorkommen.
- `conflicts` nur mit mindestens zwei zugeordneten Quellen.

**Nichts erfinden.** Es werden nur tatsächlich durchgeführte Recherchen dokumentiert. Keine erfundenen Suchvorgänge, Suchbegriffe, Quellen, Zitate oder Zahlen. Ein Durchgang ohne gefundene Quelle wird mit leerer `sourceIds`-Liste und ehrlichem Ergebnis eingetragen. Unsicherheit wird nicht künstlich beseitigt: Eine Aussage mit widersprüchlicher Quellenlage bleibt `Teilweise belegt`, `Irreführend / Kontext fehlt` oder `Nicht ausreichend belegbar`, statt zugunsten einer Seite entschieden zu werden. Suchtrefferausschnitte, die nicht gelesen wurden, sind keine geprüfte Quelle.

Der Generator gibt das Feld im Kapitelbericht als Abschnitt „Recherchedokumentation“ aus; die Webseite zeigt es in den Details der Aussage. Statistik und Faktenampel ändern sich dadurch nicht.

## 5. Bestehende Faktenchecks erneut prüfen

Die Nachprüfung ist **gezielt** und **freigabepflichtig**:

1. **Kandidaten ermitteln:** `scripts/Get-RecheckCandidates.ps1` listet (nur lesend, ohne Dateien zu schreiben) je Video die Aussagen mit Status `Offen`, `In Bearbeitung`, `Nicht überprüfbar` oder Bewertung `Nicht ausreichend belegbar` sowie, ob schon eine Recherchedokumentation vorliegt. Belegte, teilweise belegte, irreführende, widerlegte Aussagen und Meinungen sind keine Kandidaten und werden nicht ohne konkreten Anlass neu analysiert.
2. **Vorschlag vorlegen:** Die Kandidatenliste mit Umfang und Reihenfolge wird dem Nutzer vorgelegt. **Keine automatische Neubewertung bestehender Videos ohne vorherige Prüfung und Freigabe durch den Nutzer.**
3. **Redaktionelle Entscheidungen respektieren:** Bestehende Einordnungen und Begründungen werden nicht ungefragt überschrieben. Ergibt die Nachrecherche ein anderes Ergebnis, wird die frühere Einordnung in `migration.assessmentChange` mit Datum und Agent festgehalten (Muster: `Nachrecherche <Datum> (<Agent>): vorher …, jetzt …, weil …`) und der neue Durchgang in `research.rounds` ergänzt.
4. **Parallelarbeit beachten:** Vor Beginn offene Pull Requests, Issues und laufende Prüfungen anderer Agenten ansehen; nicht dieselbe Aussage gleichzeitig bearbeiten (siehe Agentenkoordination in `AGENTS.md`).
5. **Versionierung:** Jede Nachrecherche läuft über einen eigenen Branch und Pull Request mit der Liste der geänderten Aussage-IDs.

## 6. Referenzbeispiele

Die sechs Fälle sind als synthetische Tests in `scripts/Test-Factcheck.ps1` hinterlegt (Abschnitt „Recherche bei fehlenden Belegen“):

| Beispiel | Erwartete Einordnung |
| --- | --- |
| Eindeutig belegte Aussage | `Abgeschlossen` + `Belegt`, `gap: null`, Quelle im Durchgang dokumentiert |
| Eindeutig widerlegte Aussage | `Abgeschlossen` + `Widerlegt`, `gap: null` |
| Zunächst unbelegt, zweite Recherche findet belastbare Quelle | `Abgeschlossen` + `Belegt`, erster Durchgang ohne Quelle, zweiter mit Primärquelle |
| Prüfbar, auch nach zweiter Recherche keine ausreichenden Quellen | `Abgeschlossen` + `Nicht ausreichend belegbar`, `gap: Recherche ohne ausreichendes Ergebnis`, zwei Durchgänge, fehlende Information und nächste Schritte |
| Echte Meinungsäußerung | `Abgeschlossen` + `Meinung / Prognose`, Art `Meinung`, `gap: Kein überprüfbarer Tatsachenkern` |
| Widersprüchliche Quellen | `Abgeschlossen` + `Teilweise belegt`, `conflicts` beschreibt den Unterschied zwischen zwei Quellen |

Negativtests stellen sicher, dass eine Einordnung als nicht belegbar nach nur einem Durchgang, eine erfundene Quellen-ID im Durchgang, eine nicht dokumentierte zugeordnete Quelle, ein falscher Fall zum Status und ein Widerspruch mit nur einer Quelle abgelehnt werden.
