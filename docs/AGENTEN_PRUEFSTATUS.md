# Dauerhafte Agentenregel: Noch nicht geprüft, nicht überprüfbar oder nicht belegbar

Diese Anweisung gilt für alle KI-Agenten (Claude, Codex, ChatGPT) und für jede neue, geänderte oder nachgearbeitete Aussage. Sie legt fest, wie eine Aussage **ohne Wahr/Falsch-Urteil** eingeordnet wird. Leserinnen und Leser müssen auf einen Blick sehen, ob eine Aussage **noch nicht bearbeitet** wurde oder ob sie **geprüft, aber nicht belegbar** ist. Diese beiden Fälle dürfen nie verwechselt oder vermischt werden.

## Die vier Prüfstatus

| Status in `aussagen.json` | Anzeige auf der Webseite | Bedeutung | Bewertung (`verdict`) |
| --- | --- | --- | --- |
| `Offen` | **Noch nicht geprüft** | Grundsätzlich mit öffentlichen Quellen prüfbar, aber die Recherche ist nicht erfolgt oder nicht abgeschlossen. **Arbeitsauftrag**, kein Ergebnis. | `null` |
| `In Bearbeitung` | In Bearbeitung | Die Recherche läuft gerade. | `null` |
| `Nicht überprüfbar` | Nicht überprüfbar | **Abschließend:** Für diese Aussage gibt es grundsätzlich keine öffentliche Prüfgrundlage. | `null` |
| `Abgeschlossen` | Bewertung | Recherche erfolgt, Urteil vergeben. Dazu gehört **Nicht ausreichend belegbar**. | eine der sechs Bewertungen |

### Entscheidungsregel

Für jede Tatsachenbehauptung ohne Urteil der Reihe nach fragen:

1. **Gibt es grundsätzlich eine öffentliche Prüfgrundlage?** Nein, weil es um private Erlebnisse, Familien- oder Gesundheitsangaben, interne Firmen- oder Behördenvorgänge, unbenannte Personen oder Betriebe, Hörensagen, Innenleben oder Absichten Dritter oder eine so unbestimmte Behauptung geht, dass kein Maßstab existiert → **`Nicht überprüfbar`**. Ebenso, wenn Quellen gelesen wurden, die Aussage aber mehrere Lesarten zulässt und keine davon dem Sprecher sicher zugeschrieben werden kann.
2. **Wurde tatsächlich recherchiert und wurden die Quellen gelesen?** Ja, und sie reichen weder für Bestätigung noch Widerlegung → **`Abgeschlossen`** mit **`Nicht ausreichend belegbar`** und den gelesenen Quellen in `sourceRefs` Voraussetzung sind mindestens zwei unterschiedlich angelegte Recherchedurchgänge, dokumentiert in `research` ([AGENTEN_RECHERCHE.md](AGENTEN_RECHERCHE.md)). Ein einzelner erfolgloser Suchversuch reicht nie.
3. **Sonst** – prüfbar, aber noch nicht oder nicht fertig recherchiert → **`Offen`** (bzw. `In Bearbeitung`, solange gearbeitet wird).

### Verbindlich

- **Fehlender Zugang ist kein Ergebnis.** Wenn eine Quelle aus der Arbeitsumgebung nicht abrufbar war (z. B. YouTube, X, Händlerseiten, eine Statistikdatenbank), wenn keine Zeit war oder wenn die Originalstelle (Wortlaut, Audio) noch nicht kontrolliert wurde, bleibt die Aussage **`Offen`**. Sie darf dann **nie** als „nicht überprüfbar“ oder „nicht ausreichend belegbar“ ausgegeben werden.
- **Begründungen beginnen eindeutig.** `Nicht überprüfbar` beginnt mit `Nicht überprüfbar – <Grund>.`; `Offen` beginnt mit `Noch nicht geprüft – <was fehlt>.` und nennt in `openQuestions` den konkreten nächsten Prüfschritt (welche Quelle, welche Stelle). Der Validator (`scripts/Factcheck-Common.ps1`) weist eine Begründung „Nicht überprüfbar/Nicht überprüft“ ohne den Status `Nicht überprüfbar` zurück.
- **`Nicht überprüfbar` nur für Tatsachenbehauptungen.** Meinungen und Prognosen werden `Abgeschlossen` mit `Meinung / Prognose` eingeordnet.
- **Offene Aussagen werden nachgearbeitet.** Wer an einem Video arbeitet, sieht zuerst die Aussagen mit Status `Offen` durch und recherchiert sie, bevor neue Aussagen erfasst werden. Eine Aussage verlässt `Offen` nur durch tatsächliche Recherche (Urteil oder begründetes `Nicht ausreichend belegbar`) oder durch die Feststellung, dass sie grundsätzlich nicht prüfbar ist.
- **Wortlautprüfungen** an YouTube-Stellen sind aus der Cloud-Umgebung nicht möglich; sie bleiben `Offen` und werden auf Jens' Rechner nachgeholt.
- **Wirkung im Faktenindex** ([FAKTENINDEX.md](FAKTENINDEX.md)): Keiner der drei Fälle ohne Urteil zählt als widerlegt. Noch nicht geprüfte und laufende Aussagen gehen gar nicht in den Index ein, senken aber die Prüfabdeckung. Nicht überprüfbare zählen weder im Index noch in der Prüfabdeckung. „Nicht ausreichend belegbar“ ist ein geprüftes, ungeklärtes Ergebnis und geht als ungeklärter Anteil ein. Keine Einstufung ändern, um einen Indexwert oder eine Ampelfarbe zu erreichen.
- **Nachvollziehbarkeit.** Jede Umstufung wird in `migration.assessmentChange` mit Datum und Agent festgehalten; die frühere Begründung bleibt erkennbar.

## Prüfen bestehender Einstufungen

Bei jeder Nacharbeit an einem Video alle Aussagen ohne Urteil gegen die Entscheidungsregel prüfen. Typische Fehler:

- Überschrift „keine zugängliche Quelle“ oder „keine Quelle gelesen“ bei einer grundsätzlich prüfbaren Aussage → `Offen`.
- Pauschale Überschrift, obwohl Quellen gelesen wurden und nur die Lesart unklar ist → `Nicht überprüfbar – mehrdeutige Aussage`.
- „Behauptung über Dritte“ zu öffentlichen Personen oder dokumentierten Ereignissen (Festnahmen, Interviews, Veröffentlichungen) → in der Regel prüfbar, also `Offen`, bis tatsächlich recherchiert wurde.

## Umstellung am 18.11.2026 (Claude)

Bis zu diesem Tag gab es nur `Offen`, `In Bearbeitung` und `Abgeschlossen`. Abschließend nicht überprüfbare Aussagen standen technisch als `Offen` mit einer Begründung „Nicht überprüfbar – …“, darunter aber auch Aussagen, die nur noch nicht recherchiert waren. Alle betroffenen Aussagen wurden gegen diese Regel geprüft und umgestuft; jede Umstufung ist in `migration.assessmentChange` mit „Statusklärung 18.11.2026 (Claude)“ vermerkt.
