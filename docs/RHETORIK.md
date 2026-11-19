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

- Im Kopf jeder betroffenen Aussage eine gestrichelte Kennzeichnung „Darstellung: <Merkmal>“ hinter der Faktenbewertung.
- Detailseite: unter Statistik und Verteilungsbalken ein eigener Kasten „Darstellung“ mit Anzahl je Merkmal; ein Klick filtert die Aussagen.
- Startseite: jede Videokarte zeigt Anzahl und Art der Hinweise und den Prüfstand; oben die Gesamtzahl der Darstellungshinweise.
- Unter der Faktenbewertung jeder betroffenen Aussage, gestrichelt und farblich abgesetzt, mit der Kennzeichnung „KI-Hinweis, getrennt von der Faktenbewertung“. Begründung, Kontext, Unsicherheit, Zuverlässigkeit, Grundlage und Verlauf sind aufklappbar.
- Ein-/ausblendbar über „Rhetorik-Hinweise anzeigen“ (die Wahl wird nur im eigenen Browser gemerkt) und filterbar nach Merkmal.
- Seitenleiste „Darstellung (zweite Ebene)“: Prüfstand, Umfang, Anzahl je Merkmal, Grundlage und Grenzen. Startseite: Prüfstand je Interview.
- Statistik, Verteilungsbalken und Kategorien der Faktenebene sind mit und ohne `rhetorik.json` identisch (Browsertest).

## Prüfstand je Video

Aktualisierung 19.11.2026 ([Codex], Issue #77): Auch die fünf bisher fehlenden Videos haben jetzt eine erste, **teilweise** Darstellungsprüfung: Krall-Original 4 Hinweise, Alfred zu Krall 2, Politik4M3 zu Krall 2, Hamed Abdel-Samad 1, Alfred zu Seibt 3. Grundlage sind selbst gelesene Stellen mit Umfeld aus den im Originalplayer geöffneten automatischen deutschen Transkripten. Keine Hör-/Sichtkontrolle oder redaktionelle Bestätigung. Faktenurteile und Ampelregeln bleiben davon unberührt. Damit liegen für alle neun Videos Darstellungsdaten vor; keines ist damit vollständig auf Rhetorik geprüft. Der aktuelle Prüfstand wird auf der Startseite aus den Dateien berechnet; [Bestand und verbleibende Arbeit](VIDEO_AUFARBEITUNG_2026-11-19.md).

### Historischer Stand vom 18.11.2026

Stand 18.11.2026, Claude. Alle Hinweise sind KI-Vorschläge ohne redaktionelle Prüfung, inzwischen aber am Untertitelwortlaut geprüft.

| Video | Rolle | Ebene 2 | Hinweise | Merkmale |
| --- | --- | --- | --- | --- |
| `mdo14671BPE` Naomi Seibt bei ungeskriptet | Original | Teilweise geprüft | 8 zu 7 von 249 Aussagen | Pauschalisierung 7, Abwertung 1 |
| `mlxFA9T88I0` Horst Lüning bei ungeskriptet | Original | Teilweise geprüft | 9 zu 8 von 395 Aussagen | Pauschalisierung 5, Abwertung 2, Emotionalisierung 2 |
| `sLMyP0H7tSY` Alfred räumt auf zu Lüning | Reaktion | Teilweise geprüft | 2 zu 2 von 30 Aussagen | Ironie 2 |
| `zUnxDR5ttRU` Hank Loose zu Seibt | Reaktion | Teilweise geprüft | 4 zu 3 von 43 Aussagen | Ironie 3, Abwertung 1 |
| Krall-Videos aus PR #15 | – | Noch nicht geprüft | – | Noch nicht in `main`; nach Übernahme nachholen |

**Wortlautprüfung (zweiter Durchgang, 18.11.2026):** Alle 26 Hinweise der ersten Einordnung wurden am automatisch erzeugten deutschen YouTube-Untertitel geprüft, jeweils die Fundstelle mit Umfeld. Die Untertitel lagen privat außerhalb des Repositorys; nichts davon ist veröffentlicht. Ergebnis: 23 Hinweise bestätigt, davon viele mit höherer Einschätzung oder Zuverlässigkeit und mehrere mit genauerer Beobachtung oder genauerem Kontext. 3 Hinweise wurden entfernt, weil das Merkmal am Wortlaut nicht passt: zwei Pauschalisierungen bei Alfred (eine sachliche Überdehnung, die auf die Faktenebene gehört, und eine Zusammenfassung, die ausdrücklich nur vier untersuchte Themen nennt) und eine Pauschalisierung bei Lüning (Rückfrage des Moderators, die dem Gast eine Position zuschreibt). Die Gründe stehen im Verlauf der jeweiligen `rhetorik.json`. Der Hinweis zur Musk-Stelle bei Hank ist von „nicht beurteilbar“ auf „möglich“ gestiegen, der Sprecher bleibt ungeklärt. Ton und Bild wurden nicht gehört oder gesehen; Ironie und Sprecherwechsel sind deshalb nur textlich eingeordnet. Der Prüfstand bleibt „Teilweise geprüft“, weil das übrige Video nicht systematisch auf Darstellungsmerkmale durchgesehen wurde.

**Grundlage und Grenzen der ersten Einordnung:** Claude hatte keinen Zugriff auf Video, Ton oder Untertitel (YouTube aus der Prüfumgebung nicht erreichbar). Durchgesehen wurden die dokumentierten Prüfnotizen aller erfassten Aussagen der Faktenebene, insbesondere Meinungen, Prognosen und Stellen, die dort bereits als zugespitzt, pauschal, satirisch oder abwertend beschrieben sind. Merkmale, die in den Notizen nicht vorkommen, konnten nicht erkannt werden. Aussagen ohne Hinweis sind deshalb **nicht** als unauffällig bestätigt. Möglicher Tunnelblick und die Wiedergabe von Gegenpositionen wurden nicht markiert, weil beides eine konkret benannte fehlende Gegeninformation bzw. den vollständigen Kontext voraussetzt. Für Originale, Reaktionen und Faktenchecker gelten dieselben Maßstäbe; auch die beiden Faktencheck-Kanäle haben Hinweise erhalten.

## Weiterarbeit

1. Erledigt für alle bisherigen Hinweise (Untertitelwortlaut). Offen: die übrigen Videostellen systematisch durchsehen, damit ein Video „Vollständig geprüft“ werden kann, und Ironie oder unklare Sprecher bei Bedarf mit Ton prüfen.
2. Stellen ohne Faktenaussage (reine Rhetorik ohne prüfbaren Inhalt) ergänzen; dafür ist `claimId: null` vorgesehen.
3. Tunnelblick nur mit konkreter Gegeninformation und Quelle ergänzen.
4. Neue Videos (z. B. aus PR #15) nach ihrer Übernahme gleich mit einordnen; bis dahin zeigt die Webseite „noch nicht geprüft“.
5. Eine etwaige Rhetorik-Kennzahl braucht ein eigenes Konzept und ausdrückliche Freigabe (siehe Regel 2 in AGENTEN_RHETORIK.md).
