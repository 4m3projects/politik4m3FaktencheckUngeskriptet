# Zweite Bewertungsebene: Rhetorik und Darstellung

Erstellt von: Claude, Auftrag aus Issue #21. Fachliche Regel: [AGENTEN_RHETORIK.md](AGENTEN_RHETORIK.md).

Neben der sachlichen Faktenprüfung (Ebene 1, unverändert in `strukturiert/aussagen.json`) kann eine Videostelle **Hinweise zur Darstellung** erhalten: Wie wird etwas gesagt? Die Hinweise sind beschreibende KI-Einschätzungen. Sie ändern keine Faktenbewertung, fließen in keine Statistik ein, zählen nicht als Fehler und ergeben keine Note für Personen. Es gibt bewusst keine Gesamtkennzahl.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `faktenchecks/<ID>/rhetorik.json` | Optional. Prüfstand des Videos auf Ebene 2 und alle Rhetorik-Hinweise. Fehlt sie, gilt das Video als „noch nicht geprüft“ – nicht als unauffällig. |
| `site/rhetoric.js` | Validierung und Auswertung, gemeinsam für Webseite und Tests. Liest Aussagen nur, verändert sie nie. |
| `site/rhetoric-test.js` | Node-Tests (im Workflow), fiktive Testdaten und echte Projektdaten |
| `site/rhetoric-browser-test.js` | Playwright-Test der Anzeige (lokal, nicht im Workflow) |

Die Datei liegt bewusst **neben** `video.json` und nicht in `strukturiert/`: Dort sind nur der Faktendatensatz und seine generierten Artefakte erlaubt. Die Publikationsprüfung lässt genau diesen einen neuen Pfad zu.

## Aufbau von `rhetorik.json`

```json
{
  "schemaVersion": 1,
  "videoId": "elfstellige ID, gleich dem Verzeichnisnamen",
  "review": {
    "status": "Noch nicht geprüft | Teilweise geprüft | Vollständig geprüft",
    "checkedOn": "JJJJ-MM-TT",
    "by": "prüfender Agent oder Mensch",
    "basis": "tatsächliche Grundlage der Durchsicht",
    "coverage": "tatsächlicher Umfang, z. B. n Hinweise zu m von k Aussagen",
    "limits": ["offene Grenzen; bei „Vollständig geprüft“ leer"],
    "history": [{ "date": "JJJJ-MM-TT", "by": "…", "change": "…" }]
  },
  "annotations": [{
    "id": "<ID>-R0001",
    "claimId": "<ID>-A0001 oder null",
    "feature": "abwertung | ironie | tunnelblick | pauschalisierung | emotionalisierung | gegenposition",
    "startSeconds": 0, "endSeconds": 10,
    "speaker": { "id": "SP01 oder null", "attribution": "Bestätigt | Plausibel | Ungeklärt", "basis": "…" },
    "observation": "eigene Paraphrase der Stelle, kein Zitat",
    "reason": "kurze Begründung",
    "context": "Zitat, Satireformat, Gesprächsrolle, Reaktion auf Vorwürfe …",
    "assessment": "Erkennbar | Möglich | Nicht beurteilbar",
    "reliability": "Hoch | Mittel | Niedrig",
    "uncertainty": "was offen ist",
    "missingInformation": null,
    "status": "KI-Vorschlag | Redaktionell bestätigt | Redaktionell verworfen",
    "basis": "worauf die Markierung beruht",
    "history": [{ "date": "JJJJ-MM-TT", "by": "…", "change": "Erstmalig erfasst …" }]
  }]
}
```

Regeln, die der Validator durchsetzt:

- Je Markierung ein Merkmal. Mehrere Merkmale an derselben Stelle sind getrennte Markierungen.
- Felder wie `verdict`, `score`, `points`, `penalty` oder `rating` sind verboten; unbekannte Felder werden abgewiesen.
- `claimId` und `speaker.id` müssen in `aussagen.json` existieren; die Zeitmarke muss in der Videolaufzeit liegen.
- **Tunnelblick** braucht `missingInformation.what` und eine Quelle (`source`, HTTPS) oder nachvollziehbare Begründung (`reasoning`), außer bei „Nicht beurteilbar“.
- „Vollständig geprüft“ ist nur ohne offene Grenzen zulässig.
- Jede Markierung braucht einen Erfassungseintrag in `history`. Korrekturen werden dort ergänzt; redaktionell verworfene Markierungen bleiben in den Daten, werden aber nicht angezeigt.

## Anzeige

- Unter der Faktenbewertung jeder betroffenen Aussage, gestrichelt und farblich abgesetzt, mit der Kennzeichnung „KI-Hinweis, getrennt von der Faktenbewertung“. Begründung, Kontext, Unsicherheit, Zuverlässigkeit, Grundlage und Verlauf sind aufklappbar.
- Ein-/ausblendbar über „Rhetorik-Hinweise anzeigen“ (die Wahl wird nur im eigenen Browser gemerkt) und filterbar nach Merkmal.
- Seitenleiste „Darstellung (zweite Ebene)“: Prüfstand, Umfang, Anzahl je Merkmal, Grundlage und Grenzen. Startseite: Prüfstand je Interview.
- Statistik, Verteilungsbalken und Kategorien der Faktenebene sind mit und ohne `rhetorik.json` identisch (Browsertest).

## Prüfstand je Video

Stand 18.11.2026, Claude. Alle Hinweise sind KI-Vorschläge ohne redaktionelle Prüfung.

| Video | Rolle | Ebene 2 | Hinweise | Merkmale |
| --- | --- | --- | --- | --- |
| `mdo14671BPE` Naomi Seibt bei ungeskriptet | Original | Teilweise geprüft | 8 zu 7 von 249 Aussagen | Pauschalisierung 7, Abwertung 1 |
| `mlxFA9T88I0` Horst Lüning bei ungeskriptet | Original | Teilweise geprüft | 10 zu 9 von 395 Aussagen | Pauschalisierung 6, Abwertung 2, Emotionalisierung 2 |
| `sLMyP0H7tSY` Alfred räumt auf zu Lüning | Reaktion | Teilweise geprüft | 4 zu 4 von 30 Aussagen | Ironie 2, Pauschalisierung 2 |
| `zUnxDR5ttRU` Hank Loose zu Seibt | Reaktion | Teilweise geprüft | 4 zu 3 von 43 Aussagen | Ironie 3 (davon 1 nicht beurteilbar), Abwertung 1 |
| Krall-Videos aus PR #15 | – | Noch nicht geprüft | – | Noch nicht in `main`; nach Übernahme nachholen |

**Grundlage und Grenzen dieser ersten Einordnung:** Claude hatte keinen Zugriff auf Video, Ton oder Untertitel (YouTube aus der Prüfumgebung nicht erreichbar). Durchgesehen wurden die dokumentierten Prüfnotizen aller erfassten Aussagen der Faktenebene, insbesondere Meinungen, Prognosen und Stellen, die dort bereits als zugespitzt, pauschal, satirisch oder abwertend beschrieben sind. Merkmale, die in den Notizen nicht vorkommen, konnten nicht erkannt werden. Aussagen ohne Hinweis sind deshalb **nicht** als unauffällig bestätigt. Möglicher Tunnelblick und die Wiedergabe von Gegenpositionen wurden nicht markiert, weil beides eine konkret benannte fehlende Gegeninformation bzw. den vollständigen Kontext voraussetzt. Für Originale, Reaktionen und Faktenchecker gelten dieselben Maßstäbe; auch die beiden Faktencheck-Kanäle haben Hinweise erhalten.

## Weiterarbeit

1. Mit Text- oder Videozugang die Hinweise am Wortlaut prüfen, Zuverlässigkeit anheben oder Hinweise verwerfen und im Verlauf dokumentieren.
2. Stellen ohne Faktenaussage (reine Rhetorik ohne prüfbaren Inhalt) ergänzen; dafür ist `claimId: null` vorgesehen.
3. Tunnelblick nur mit konkreter Gegeninformation und Quelle ergänzen.
4. Neue Videos (z. B. aus PR #15) nach ihrer Übernahme gleich mit einordnen; bis dahin zeigt die Webseite „noch nicht geprüft“.
5. Eine etwaige Rhetorik-Kennzahl braucht ein eigenes Konzept und ausdrückliche Freigabe (siehe Regel 2 in AGENTEN_RHETORIK.md).
