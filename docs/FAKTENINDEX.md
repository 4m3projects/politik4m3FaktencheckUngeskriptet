# Faktenindex – gemeinsame Regel für alle Politik4M3-Faktenchecks

Erstellt von: Claude, auf Auftrag von Jens (20.11.2026). Regelstand 1.4 (Verlauf in Abschnitt 7).

**Diese Datei ist in allen drei Repositories gleich** (`politik4m3Facktencheck` maßgeblich, `politik4m3FaktencheckUngeskriptet`, `politik4m3FaktencheckKlima`). Sie ist Pflichtlektüre für alle KI-Agenten (Claude, Codex, ChatGPT), die Aussagen bewerten, Bedeutungsfaktoren vergeben oder kontrollieren. Sie erläutert die drei wertenden Faktenurteile sowie die nicht gewerteten Prüfzustände.

## 1. Wo die Regel steht

| Datei | Inhalt | In allen drei Repositories |
| --- | --- | --- |
| `site/faktenindex.js` | Konfiguration (`CONFIG`: Faktor 5, Ampelschwellen, Mindestabdeckung, Abbildung der Kategorien, Skala der Bedeutungsfaktoren), Berechnung, Ampel, Prüfung der Datenfelder | bytegleich |
| `site/faktenindex-ui.js` | Anzeige (Ampel mit Index, Kopf der Videoseite, aufklappbare Rechnung, Angaben je Aussage, Methodik) | bytegleich |
| `site/faktenindex-test.js` | Tests, auch über alle echten Videos | bytegleich |
| `scripts/faktenindex.js` | `pruefen` (CI), `bericht`, `json` | bytegleich |
| `docs/FAKTENINDEX.md` | diese Regel | bytegleich |

Änderungen an Schwellen oder Regeln nur in `site/faktenindex.js` des Hauptprojekts, mit Tests und Anpassung dieser Datei, danach unverändert in die Schwesterprojekte übernehmen. Die CI der Schwesterprojekte vergleicht die fünf Dateien mit dem Hauptprojekt und schlägt bei Abweichung fehl. So kann keine Seite einen anderen Standard oder einen veralteten Wert zeigen.

Der Index wird **nie gespeichert**. Er wird bei jedem Seitenaufruf aus `strukturiert/aussagen.json` berechnet. Ändert sich eine Bewertung, kommt eine Aussage hinzu, wird eine Aussage zusammengeführt oder ein Bedeutungsfaktor geändert, ändern sich Videokarten, Videoseite, Aussagen, Themenseiten, Methodik-Übersicht und Verlauf beim nächsten Deploy automatisch und einheitlich.

## 2. Berechnung

Für jede Aussage: p = belegter, f = widerlegter, u = ungeklärter Anteil (p + f + u = 1), R = Bedeutungsfaktor.

**I = Σ(R·p) / Σ[R·(p + 5·f + u)]**, Anzeige mit drei Nachkommastellen (z. B. 0,742). Die Ampel vergleicht den auf drei Stellen gerundeten Wert, damit Anzeige und Farbe nie auseinanderfallen.

Beispiele (R = 1): 10 belegt/0 widerlegt → 1,000; 10/1 → 0,667; 20/1 → 0,800; 100/1 → 0,952; 0/10 → 0,000. 30 belegt (R = 1) und 1 widerlegt (R = 3) → 0,667.

### Abbildung der bestehenden Kategorien

| Kategorie / Status | p | f | u | Index | Prüfabdeckung |
| --- | --- | --- | --- | --- | --- |
| Belegt | 1 | 0 | 0 | ja | geprüft |
| Teilweise belegt (Altbewertung) | – | – | – | nein | Nachprüfung ausstehend |
| Irreführend / Kontext fehlt | 0,75 | 0,25 | 0 | ja | geprüft |
| Widerlegt | 0 | 1 | 0 | ja | geprüft |
| Nicht ausreichend belegbar (Altbewertung) | – | – | – | nein | Nachprüfung ausstehend |
| Offen (noch nicht geprüft oder Ergebnis ungeklärt) | – | – | – | nein | ausstehend |
| In Bearbeitung (Prüfung begonnen) | – | – | – | nein | ausstehend |
| Nicht überprüfbar | – | – | – | nein | nicht gezählt |
| Meinung / Prognose, Werturteil, Satire, künstlerische Zuspitzung | – | – | – | nein | nicht gezählt |
| Nur erwähnt, nachgefragt oder zurückgewiesen (alle Vorkommen `Rückfrage`, `Fremdbezug`, `Zurückweisung` oder Rolle ungeklärt) | – | – | – | nein | nicht gezählt |
| Wiederholung (`factIndex.duplicateOf`) | – | – | – | nein | nicht gezählt |
| Aussage einer zitierten Person, die das Video nur wiedergibt oder zurückweist; Gastaussage, der das Video deutlich widerspricht (`attribution`, Abschnitt 4a) | – | – | – | nein | nicht gezählt |
| Aussage einer anderen Person, Haltung des Videos ungeklärt (`attribution.creatorStance: "Ungeklärt"`) | – | – | – | nein | ausstehend |

Begründung der Abbildung:

- **Fehlende Quelle ist kein Gegenbeweis.** Offen und in Bearbeitung fließen nicht in den Index ein und gelten für die Prüfabdeckung als ausstehend. Eine Recherche ohne ausreichende Belege bleibt offen.
- **Nicht überprüfbar:** Ohne öffentliche Prüfgrundlage zählt die Aussage weder für den Index noch für die Abdeckung.
- **Altbewertungen:** „Teilweise belegt“ und „Nicht ausreichend belegbar“ sind keine neuen Urteile. Bestehende Einstufungen bleiben nachvollziehbar, werden nicht automatisch in ein anderes Urteil umgewandelt und zählen bis zur Einzelprüfung nicht im Index. An den bisherigen Gewichten und Schwellen ändert sich nichts.
- **Irreführend / Kontext fehlt**: Der wörtliche Kern stimmt meist, es fehlt aber Kontext, sodass ein schiefer Eindruck entsteht. Ohne genauere Angabe zählt die Aussage deshalb zu drei Vierteln belegt und zu einem Viertel widerlegt. Wenn der erzeugte Eindruck es begründet, können die Anteile angepasst werden. Nachweislich falsche, eigenständig überprüfbare Teilbehauptungen werden stattdessen einzeln als „Widerlegt“ erfasst.
- Jede Aussage zählt **einmal**, egal wie viele Fundstellen sie hat. Identische Aussagen werden ohnehin zusammengeführt (Validator); inhaltlich gleiche, getrennt erfasste Aussagen markiert man mit `duplicateOf`.

## 3. Prüfabdeckung, Ampel und Bewertbarkeit

**Prüfabdeckung** = geprüfte ÷ (geprüfte + Prüfung begonnen + noch nicht geprüft) relevante Tatsachenbehauptungen, gezählt ohne Gewichtung und unabhängig vom Index. Angezeigt wird sie abgerundet, damit nie mehr Abdeckung erscheint als erreicht.

**Ampel** – ausschließlich aus Index und Bewertbarkeit, nie von Hand oder von einem Agenten gesetzt:

- Grün: Index ≥ 0,800 · Gelb: 0,400 bis unter 0,800 · Rot: unter 0,400
- **Grau – nicht bewertbar**, wenn kein Index berechenbar ist, weniger als 10 Aussagen eingehen (Shorts und Musikvideos: 3, weil vollständig erfasst), die Prüfabdeckung unter **80 %** liegt oder weniger als 20 Tatsachenbehauptungen je Stunde erfasst sind (eine Auswahl, kein Querschnitt).
- **Grau – Prüfung läuft**, wenn `video.json` „In Bearbeitung“ sagt oder eine der Bedingungen fehlt und noch Prüfungen ausstehen. Ist das Video als „Abgeschlossen“ geführt, steht nie „Prüfung läuft“.
- Ein schon berechneter Index wird bei grauer Ampel als **vorläufig** angezeigt.

**Mindestabdeckung 80 %: vorläufiger, bewusst vorsichtiger Standard** (`CONFIG.minCoverageProvisional`). Er soll verhindern, dass eine Ampel ein Gesamtbild suggeriert, solange ein Fünftel der prüfbaren Aussagen fehlt. Kalibrieren, sobald genug abgeschlossene Videos vorliegen; Änderung nur nach Rücksprache mit Jens.

Bestehende Zusatzbewertungen (Darstellung/Rhetorik, Gegendarstellungen, Statistik je Kategorie) bleiben eigenständig und fließen nicht ein.

## 4. Datenfelder je Aussage (`claims[].factIndex`, optional)

Fehlt das Feld, gilt **R = 1,0 (Standardwert, noch nicht einzeln eingeschätzt)** und die Standardabbildung. So wurden alle bestehenden Faktenchecks migriert: keine Aussage, Quelle oder Bewertung wurde verändert.

```json
"factIndex": {
  "weight": 3,
  "weightReason": "Diese Behauptung bildet die Grundlage der zentralen Schlussfolgerung des Videos.",
  "weightStatus": "Vorläufig",
  "assessedBy": "Claude",
  "assessedOn": "2026-11-21",
  "assessedBeforeVerdict": true,
  "shares": { "p": 0.5, "f": 0.25, "u": 0.25 },
  "sharesReason": "Die Zahl stimmt, der Zeitraum ist falsch, die Ursache ist offen.",
  "duplicateOf": "<Aussage-ID>",
  "reviews": [ { "agent": "ChatGPT", "date": "2026-11-22", "result": "Abweichend", "proposedWeight": 2, "reason": "…" } ],
  "history": [ { "date": "2026-11-22", "agent": "Claude", "field": "weight", "previous": 1, "next": 3, "reason": "…" } ]
}
```

- `weight`: 0,5 bis 3,0 in Viertelschritten. Ungleich 1,0 nur mit `weightReason`. Mit `weight` immer `weightStatus`, `assessedBy`, `assessedOn`, `assessedBeforeVerdict`.
- `weightStatus`: `Vorläufig` (nur eingeschätzt), `Gegengeprüft` (mindestens eine bestätigende Kontrolle eines **anderen** Agenten, nach der letzten abweichenden), `Strittig` (begründete abweichende Einschätzung ohne Konsens).
- `shares`: bei „Irreführend / Kontext fehlt“ in Schritten von 0,05 mit Summe 1, f > 0 und `sharesReason`. Historische Metadaten bei „Teilweise belegt“ bleiben lesbar, haben aber keinen Einfluss auf den Index.
- `duplicateOf`: Verweis auf die zusammengeführte Hauptaussage (nicht auf eine weitere Wiederholung).
- Geprüft wird alles von `node scripts/faktenindex.js pruefen` (CI).

## 4a. Wer sagt es? Zitate nicht dem Video anlasten (`claims[].attribution`, optional)

Regel von Jens (20.11.2026): Bewertet wird das Video, nicht jede Person, die darin vorkommt. Zeigt ein Video einen Ausschnitt, liest ein Zitat vor oder lässt eine andere Person etwas sagen, und diese Aussage ist falsch, ist das **nur dann ein Fehler des Videos, wenn das Video sie sich zu eigen macht**. Stellt das Video sie klar oder gibt es sie nur wieder, zählt sie nicht.

Fehlt das Feld, gilt die Aussage als Aussage des Videos selbst (Ersteller, Moderation, Kanalfigur, Gesprächsteilnehmer) wie bisher.

```json
"attribution": {
  "statementBy": "Zitierte Person",
  "person": "Name oder kurze Beschreibung, z. B. „Bundesfinanzminister (Ausschnitt Tagesschau)“",
  "presentation": "Einspieler",
  "creatorStance": "Distanziert",
  "basis": "Direkt nach dem Ausschnitt nennt der Moderator die korrekte Zahl und bezeichnet die Aussage als falsch.",
  "assessedBy": "Claude",
  "assessedOn": "2026-11-20"
}
```

| Feld | Werte |
| --- | --- |
| `statementBy` | `Zitierte Person` (nimmt nicht selbst am Video teil: Einspieler, fremder Videoausschnitt, vorgelesenes Zitat, eingeblendeter Beitrag) · `Gast` (spricht selbst im Gespräch des Videos) |
| `presentation` | `Einspieler`, `Vorgelesenes Zitat`, `Einblendung`, `Sinngemäße Wiedergabe` (nur zitierte Personen) · `Gespräch` (nur Gäste) |
| `creatorStance` | `Übernommen` · `Nur wiedergegeben` · `Distanziert` · `Ungeklärt` |
| `basis` | Woran die Haltung des Videos erkennbar ist (Paraphrase, kein Wortlaut) |

Wirkung im Faktenindex:

| Wer | Übernommen | Nur wiedergegeben | Distanziert | Ungeklärt |
| --- | --- | --- | --- | --- |
| Zitierte Person | zählt | zählt nicht | zählt nicht | nicht im Index, Abdeckung ausstehend |
| Gast | zählt | zählt (das Video lässt die Aussage stehen) | zählt nicht | nicht im Index, Abdeckung ausstehend |

So wird entschieden:

- **Übernommen**: Das Video stimmt zu, nutzt das Zitat als Beleg oder Stütze der eigenen These oder stellt es als zutreffend dar. Auch ein unkommentiert eingesetzter Ausschnitt, der erkennbar die eigene Argumentation tragen soll, ist übernommen.
- **Nur wiedergegeben**: Das Zitat ist Gegenstand, nicht Teil der eigenen Argumentation, z. B. „X behauptet …“ in einer Dokumentation der Positionen, eine Gegenposition, der Anlass einer Reaktion, ohne dass das Video es bestätigt.
- **Distanziert**: Das Video widerspricht, korrigiert, ordnet das Zitat erkennbar als falsch oder zweifelhaft ein oder grenzt sich deutlich ab.
- **Ungeklärt**: nur, solange die Stelle nicht im Zusammenhang geprüft wurde. Nicht raten.
- Bei Reaktionsvideos ist das gezeigte Originalvideo eine zitierte Person; die Reaktion des Kanals ist die Aussage des Videos.
- Die Rollen der einzelnen Fundstellen (`occurrences[].role`: `Fremdbezug`, `Zurückweisung` …) gelten weiter. `attribution` ergänzt sie um die Frage, **wessen** Aussage es ist, wenn eine andere Person sie im Video selbst ausspricht oder sie eingeblendet wird.
- Der Faktenstatus (`verdict`, `reason`) der zitierten Aussage wird unabhängig davon geprüft und bleibt sichtbar. `attribution` ist nie eine Neubewertung.

Darstellung: Im Kopf der Aussage steht „Zitat: Person“ bzw. „Gast: Person“, bei Tatsachenbehauptungen ergänzt um „nicht dem Video angerechnet“, „vom Video übernommen“ oder „Haltung ungeklärt“. Aufgeklappt zeigt „Wer sagt das?“ Person, Haltung des Videos, Begründung und Wirkung im Index. Bei Aussagen ohne Feld steht dort „Das Video selbst“.


### Deutlich getrennte Anzeige von Faktenstatus und Zurechnung (21.11.2026)

Die Oberfläche zeigt eine **zweite, eigenständige Kennzeichnung** für fremde Aussagen. Eine widerlegte fremde Aussage bleibt im Faktenstatus **rot** (der Satz ist falsch). Wenn die zentrale Einstufung `FactIndex.classify` jedoch `zitat` oder `fremdbezug` ergibt, erscheint direkt unter der Aussage ein **grün akzentuierter Hinweis „Nicht dem Video angerechnet“**, einschließlich Sprecher/Haltung und – falls vorhanden – dokumentierter Begründung. **Grün steht hier nur für die fehlende Zurechnung, nicht für einen korrekten Inhalt.** Diese Darstellung gilt auch für die zeitlich synchronisierte Videoansicht.

Bei `zuordnung_offen` erscheint statt Grün ein neutraler Warnhinweis; bei `Übernommen` sowie nicht ausdrücklich zurückgewiesenen Gastaussagen keine Entlastung. Urteile, Kennzahlen, Daten und Indexrechnung ändern sich **nicht** durch diese rein visuelle Anpassung. Wenn eine bisher unmarkierte Aussage falsch zugeordnet ist, muss die ursprüngliche Zuschreibung quellenbasiert separat geprüft werden.

## 5. Bedeutungsfaktoren vergeben (Agentenregel)

Skala: **0,5** nebensächlich · **1,0** normal · **1,5** erhöht · **2,0** hoch · **3,0** sehr hoch (Zwischenwerte in Viertelschritten).

Kriterien:

1. Wie zentral ist die Aussage für die Hauptthese?
2. Wie stark beeinflusst sie die Argumentation des Videos?
3. Welche tatsächlichen Folgen könnte eine falsche Darstellung haben?
4. Wird sie besonders hervorgehoben (Titel, Vorschaubild, Fazit, mehrfach betont)?
5. Ist sie eigenständig oder nur Wiederholung/Beiwerk?

Praktische Stufen (Stand 20.11.2026, so für alle bestehenden Videos angewandt):

| Rolle der Aussage im Video | Faktor |
| --- | --- |
| Hauptthese oder direkte Antwort auf die im Titel gestellte Frage | 2,0–3,0 |
| Tragende Begründung der Hauptthese, zentrale Zahl der Argumentation | 1,5 |
| Normale eigenständige Sachaussage | 1,0 |
| Beiläufige Nebenbemerkung, Anekdote, Werbeeinblendung, Hinweis zur Machart des Videos | 0,5 |

**Ablauf bei neuen Videos:** Wer ein Video abschließt, vergibt für jede relevante Tatsachenbehauptung (ohne „Nicht überprüfbar“ und reine Fremdbezüge) einen Faktor mit Begründung, auch für den Standard 1,0, mit `weightStatus: "Vorläufig"`. Die Gegenprüfung durch einen anderen Agenten folgt nach Abschnitt 6, sobald Kapazität frei ist. Bis dahin zählt der vorläufige Faktor im Index und ist auf der Seite als vorläufig gekennzeichnet.

**Neutralitätsregel:** Die Bedeutung wird unabhängig vom Faktenurteil festgelegt. Eine zentrale belegte Aussage bekommt denselben Faktor wie eine zentrale widerlegte. Möglichst **vor** Kenntnis des Urteils einschätzen (`assessedBeforeVerdict: true`); wer das Urteil schon kennt, setzt `false` und begründet besonders sorgfältig. Nie einen Faktor wählen, um eine Ampelfarbe zu erreichen. Falsche Aussagen bekommen nicht automatisch höhere Faktoren; die Kontrolle achtet auf eine Schieflage (z. B. fast nur widerlegte Aussagen hochgestuft).

Die Begründung nennt, welche Kriterien zutreffen, z. B. „Die Behauptung bildet die Grundlage der zentralen Schlussfolgerung des Videos. Eine Widerlegung beeinflusst deshalb die Bewertung der gesamten Argumentation erheblich.“

Ein Bedeutungsfaktor ist **keine** Neubewertung des Faktenstatus. Faktenurteile ändern sich nur mit sachlicher Grundlage nach den bestehenden Regeln (`migration.assessmentChange`).

## 6. Kontrolle durch einen zweiten Agenten

- Jeder Faktor ungleich 1,0 und jede eigene Anteilsangabe wird von einem **anderen** Agenten kontrolliert; Faktoren ab 2,0 und 0,5 immer.
- Prüffragen: Ist der Faktor sachlich gerechtfertigt? Ist die Begründung nachvollziehbar? Wurde die Bedeutung unabhängig vom Faktenstatus eingeschätzt? Werden vergleichbare Aussagen (im Video und zwischen Videos) vergleichbar behandelt? Gibt es Doppelzählungen?
- Ergebnis als Eintrag in `reviews` (`Bestätigt` oder `Abweichend` mit `proposedWeight` und Begründung). Auf GitHub wie gewohnt mit Agentenkennzeichnung (AGENTS.md, „Zusammenarbeit mehrerer KI-Agenten“).
- Bei Abweichung vergleichen die Agenten ihre Begründungen öffentlich. Entscheidend sind Argumente, nicht die Zahl der Zustimmenden; eine unbegründete Übernahme ist kein Konsens. Ohne begründeten Konsens: `weightStatus: "Strittig"`, beide Einschätzungen bleiben sichtbar. Strittige Faktoren bleiben im Index mit dem eingetragenen Wert; der ungewichtete Vergleichsindex zeigt den Einfluss.

## 7. Änderungen dokumentieren

Jede Änderung von `weight` oder `shares` erhält einen Eintrag in `history` (Datum, Agent, Feld, alter und neuer Wert, Grund). Die **Auswirkung auf den Gesamtindex** wird nicht von Hand eingetragen, sondern automatisch aus der Git-Historie berechnet: Die Seite „Verlauf“ (`scripts/verlauf.js`) zeigt für jeden Stand „Faktenindex alt → neu“ und „Bedeutungsfaktoren geändert“ samt Link zur Änderung. Historische Indexwerte werden dabei mit der jeweils aktuellen Regel berechnet. Ändert sich die Regel selbst (`CONFIG.version`), steht das in dieser Datei.

### Regelstände

| Version | Datum | Änderung | Grund |
| --- | --- | --- | --- |
| 1.4 | 26.11.2026 | Nur Belegt, Irreführend / Kontext fehlt und Widerlegt zählen; zwei frühere Kategorien werden bis zur Einzelprüfung ausgeschlossen | Auftrag Jens. |
| 1.0 | 20.11.2026 | Einführung mit Widerlegungsfaktor 10 | Auftrag Jens |
| 1.1 | 20.11.2026 | Widerlegungsfaktor 10 → 5 | Mit 10 begann Rot schon bei etwa 13 % widerlegter Aussagen und Grün verlangte höchstens etwa 2,5 %. Das war gegenüber der früheren Ampel (Grün unter 10 %, Rot ab 25 % Fehleranteil) deutlich zu streng. Mit 5 liegt Rot bei etwa 23 %, Grün bei höchstens etwa 4,8 %. Freigabe durch Jens. |
| 1.3 | 20.11.2026 | Wer sagt es? (`attribution`, Abschnitt 4a): Aussagen zitierter Personen zählen nur, wenn das Video sie übernimmt; Gastaussagen nicht, wenn das Video ihnen widerspricht | Falsche Zitate wurden bisher dem Video angelastet, obwohl es sie nur zeigte oder richtigstellte. Regel von Jens. |
| 1.2 | 20.11.2026 | Standardanteile: Teilweise belegt 0,5/0/0,5 → 0,75/0/0,25; Irreführend / Kontext fehlt 0,5/0,5/0 → 0,75/0,25/0 | Beide Kategorien bedeuten in der Prüfpraxis meist „Kern stimmt, Details oder Kontext fehlen“. Die halbe Wertung als ungeklärt bzw. widerlegt zog Erklärvideos mit vielen Verallgemeinerungen unverhältnismäßig nach unten (Beispiel MrWissen2go Frankreich: nur 2 Widerlegungen, Index 0,417). Freigabe durch Jens. |

## 8. Darstellung

- Karten, Listen, Themenseiten: Ampel mit „Faktenindex 0,742 · Gelb“, darunter Bewertung, Prüfabdeckung und Prüfstand.
- Videoseite: Kennzahlen Faktenindex, Ampel, Prüfabdeckung, Bewertung; ein Erklärsatz; aufgeklappt die Rechnung mit Zahlen, Beiträge je Kategorie, Abdeckung nach Zuständen, Ampelbegründung, Vergleich gewichtet/ungewichtet mit Differenz und die Aussagen mit eigenem Faktor.
- Aussage (aufgeklappt): Faktenstatus, Anteile, Bedeutungsfaktor mit Stufe, Status, Agent und Begründung, Einfluss (Index mit/ohne diese Aussage), Kontrollen und abweichende Einschätzungen, Änderungen, beteiligte Agenten. Ein Faktor ungleich Standard steht zusätzlich als kleines Kennzeichen im Kopf der Aussage.
- Methodik (`#/methodik#faktenindex`): Regel, Beispiele, Abbildungstabelle, Skala, Schwellen; alle Zahlen aus `CONFIG`.

## 9. Offene Aufgaben

- **Bedeutungsfaktoren gegenprüfen:** Am 20.11.2026 hat Claude für alle bestehenden Videos aller drei Seiten Faktoren vergeben (Status „Vorläufig“). Die Gegenprüfung durch einen zweiten Agenten ist in jedem Repository als offenes Issue „[Claude] Mitmachen: Bedeutungsfaktoren gegenprüfen“ ausgeschrieben.
- **Teilweise belegt präzisieren:** Frühere Einträge gezielt an Original und Quellen nachprüfen, gegebenenfalls trennen. Keine automatische Umwertung.
- **Sprecherzuordnung prüfen:** Bestehende Aussagen wurden vor Regelstand 1.3 erfasst und haben noch kein `attribution`. Ein Agent prüft in jedem Repository alle Videos auf Zitate und Gastaussagen (Issue „[Claude] Mitmachen: Sprecherzuordnung prüfen“).
- **Mindestabdeckung kalibrieren**, sobald genug abgeschlossene Videos vorliegen.
