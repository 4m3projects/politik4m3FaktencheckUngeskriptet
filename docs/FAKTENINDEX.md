# Faktenindex – gemeinsame Regel für alle Politik4M3-Faktenchecks

Erstellt von: Claude, auf Auftrag von Jens (20.11.2026). Regelstand 1.0.

**Diese Datei ist in allen drei Repositories gleich** (`politik4m3Facktencheck` maßgeblich, `politik4m3FaktencheckUngeskriptet`, `politik4m3FaktencheckKlima`). Sie ist Pflichtlektüre für alle KI-Agenten (Claude, Codex, ChatGPT), die Aussagen bewerten, Bedeutungsfaktoren vergeben oder kontrollieren. Sie ergänzt die bestehenden Regeln; die sechs Bewertungskategorien, die vier Prüfstatus und ihre Begründungen bleiben unverändert.

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
| Teilweise belegt | 0,5 | 0 | 0,5 | ja | geprüft |
| Irreführend / Kontext fehlt | 0,5 | 0,5 | 0 | ja | geprüft |
| Widerlegt | 0 | 1 | 0 | ja | geprüft |
| Nicht ausreichend belegbar (geprüft, ungeklärt) | 0 | 0 | 1 | ja | geprüft |
| Offen (noch nicht geprüft) | – | – | – | nein | ausstehend |
| In Bearbeitung (Prüfung begonnen) | – | – | – | nein | ausstehend |
| Nicht überprüfbar | – | – | – | nein | nicht gezählt |
| Meinung / Prognose, Werturteil, Satire, künstlerische Zuspitzung | – | – | – | nein | nicht gezählt |
| Nur erwähnt, nachgefragt oder zurückgewiesen (alle Vorkommen `Rückfrage`, `Fremdbezug`, `Zurückweisung` oder Rolle ungeklärt) | – | – | – | nein | nicht gezählt |
| Wiederholung (`factIndex.duplicateOf`) | – | – | – | nein | nicht gezählt |

Begründung der Abbildung:

- **Fehlende Quelle ist kein Gegenbeweis.** „Nicht ausreichend belegbar“ ist ungeklärt (u), nie widerlegt.
- **Ungeprüft ist weder widerlegt noch ungeklärt.** Offene und laufende Prüfungen gehen gar nicht in den Index ein, senken aber die Prüfabdeckung. „Noch nicht geprüft“ und „geprüft, aber ungeklärt“ bleiben getrennt.
- **Nicht überprüfbar** heißt: Es gibt grundsätzlich keine öffentliche Prüfgrundlage (private Erlebnisse, interne Vorgänge …). Das ist kein Mangel der Faktenlage des Videos, sondern keine bewertbare Tatsachenbehauptung. Die Zahl steht trotzdem sichtbar in der Rechnung.
- **Teilweise belegt** heißt in den Altdaten nicht einheitlich, ob der nicht belegte Teil offen oder falsch ist. Ohne genauere Angabe wird er deshalb als ungeklärt geführt (keine künstliche Genauigkeit). Zeigt die Prüfung einen widerlegten Teil, setzt der Agent eigene Anteile (siehe 4).
- **Irreführend / Kontext fehlt**: Der wörtliche Kern stimmt meist, der erzeugte Eindruck nicht; daher halb belegt, halb widerlegt.
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
- `shares`: nur bei „Teilweise belegt“ und „Irreführend / Kontext fehlt“, Schritte 0,05, Summe 1, mit `sharesReason`. Teilweise belegt braucht 0 < p < 1, Irreführend f > 0. Bei den übrigen Kategorien sind die Anteile fest.
- `duplicateOf`: Verweis auf die zusammengeführte Hauptaussage (nicht auf eine weitere Wiederholung).
- Geprüft wird alles von `node scripts/faktenindex.js pruefen` (CI).

## 5. Bedeutungsfaktoren vergeben (Agentenregel)

Skala: **0,5** nebensächlich · **1,0** normal · **1,5** erhöht · **2,0** hoch · **3,0** sehr hoch (Zwischenwerte in Viertelschritten).

Kriterien:

1. Wie zentral ist die Aussage für die Hauptthese?
2. Wie stark beeinflusst sie die Argumentation des Videos?
3. Welche tatsächlichen Folgen könnte eine falsche Darstellung haben?
4. Wird sie besonders hervorgehoben (Titel, Vorschaubild, Fazit, mehrfach betont)?
5. Ist sie eigenständig oder nur Wiederholung/Beiwerk?

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
| 1.0 | 20.11.2026 | Einführung mit Widerlegungsfaktor 10 | Auftrag Jens |
| 1.1 | 20.11.2026 | Widerlegungsfaktor 10 → 5 | Mit 10 begann Rot schon bei etwa 13 % widerlegter Aussagen und Grün verlangte höchstens etwa 2,5 %. Das war gegenüber der früheren Ampel (Grün unter 10 %, Rot ab 25 % Fehleranteil) deutlich zu streng. Mit 5 liegt Rot bei etwa 23 %, Grün bei höchstens etwa 4,8 %. Freigabe durch Jens. |

## 8. Darstellung

- Karten, Listen, Themenseiten: Ampel mit „Faktenindex 0,742 · Gelb“, darunter Bewertung, Prüfabdeckung und Prüfstand.
- Videoseite: Kennzahlen Faktenindex, Ampel, Prüfabdeckung, Bewertung; ein Erklärsatz; aufgeklappt die Rechnung mit Zahlen, Beiträge je Kategorie, Abdeckung nach Zuständen, Ampelbegründung, Vergleich gewichtet/ungewichtet mit Differenz und die Aussagen mit eigenem Faktor.
- Aussage (aufgeklappt): Faktenstatus, Anteile, Bedeutungsfaktor mit Stufe, Status, Agent und Begründung, Einfluss (Index mit/ohne diese Aussage), Kontrollen und abweichende Einschätzungen, Änderungen, beteiligte Agenten. Ein Faktor ungleich Standard steht zusätzlich als kleines Kennzeichen im Kopf der Aussage.
- Methodik (`#/methodik#faktenindex`): Regel, Beispiele, Abbildungstabelle, Skala, Schwellen; alle Zahlen aus `CONFIG`.

## 9. Offene Aufgaben

- **Bedeutungsfaktoren einschätzen:** Alle bestehenden Aussagen stehen auf dem Standard 1,0. Die Agenten schätzen die Bedeutung Video für Video ein und lassen sie gegenprüfen; bis dahin sind gewichteter und ungewichteter Index gleich.
- **Teilweise belegt präzisieren:** Bei Aussagen mit nachweislich falschem Teil eigene Anteile mit Begründung setzen.
- **Mindestabdeckung kalibrieren**, sobald genug abgeschlossene Videos vorliegen.
