# YouTube Shorts prüfen

Erstellt von: Claude, auf Auftrag von Jens (19.11.2026). Übernommen aus dem Schwesterprojekt politik4m3Facktencheck; erstes Beispiel dort: gVQeb83GHDQ.

Shorts sind kurze Hochkantvideos (höchstens drei Minuten). Sie werden wie jedes andere Video geprüft: gleiche Ablage, gleiches Datenmodell (Schema 2), gleiche Bewertungskategorien und Rechteregeln aus [AGENTS.md](../AGENTS.md). Diese Datei beschreibt nur, was bei Shorts anders ist.

## Erfassen

- **Adresse:** Eine Shorts-Adresse `https://www.youtube.com/shorts/<ID>` ist eine einzelne Video-URL. `scripts/Import-YouTubeTranscript.ps1` erkennt sie (auch `youtu.be/<ID>`, `/live/` und `/embed/`) und arbeitet intern mit der normalen Adresse `https://www.youtube.com/watch?v=<ID>`. yt-dlp meldet Shorts ebenfalls unter dieser Adresse; das Skript weist deshalb bei Hochformat plus höchstens drei Minuten Laufzeit ausdrücklich auf einen Short hin.
- **Gespeicherte Adresse:** `scope.videoUrl` in `aussagen.json`, `videoUrl` in `video.json` und die Quelle S001 verwenden immer die normale watch-Adresse. Die Prüfung `Factcheck-Common.ps1` verlangt das, und nur so funktionieren Zeitmarken (`&t=<Sekunden>s`). YouTube spielt einen Short unter dieser Adresse im normalen Player ab.
- **Kennzeichen:** In `video.json` das Feld `"format": "short"` setzen. Es ist optional; fehlt es, gilt das Video als normales Video (`"video"`). Andere Werte lehnt die Prüfung in `site/relations.js` ab. Ohne `video.json` erkennt die Webseite einen Short hilfsweise an einer `/shorts/`-Adresse.
- **Untertitel:** Shorts haben oft nur automatische Untertitel und keine Kapitel. Das ist normal. Die private Ablage, Grenzen der automatischen Erkennung und das Verbot, Untertitel zu veröffentlichen, gelten unverändert.

## Gliederung und Berichte

- Ein Short braucht keine Kapitel. Ein einziger Themenbereich über die ganze Laufzeit (`chapter: 1`, `00:00:00–<Ende>`) genügt; mehrere nur bei echten Themenwechseln.
- `01_kurz.md` darf kürzer als üblich sein, wenn der Short wenig Inhalt hat. `02_analyse.md` nennt trotzdem den Zeitbereich.
- Ein Short wird **immer vollständig** erfasst: jede prüfbare Tatsachenbehauptung über die ganze Laufzeit. `scope.kind` ist deshalb in der Regel `Vollbestand`. Ein Teilbestand ist bei Shorts nur mit Begründung zulässig (z. B. unverständliche Stelle).
- Zeitmarken sind Sekunden. Weil ein Short nur wenige Minuten dauert, möglichst enge Bereiche (wenige Sekunden) angeben. Ohne Hör- oder Sichtkontrolle bleiben sie `Ungefähr`.
- Beschreibung und Titel des Shorts sind Kontext, kein Prüfgegenstand (AGENTS.md, Abschnitt 2). Geprüft wird, was im Video gesagt oder gezeigt wird.

## Webseite

- **Player im Hochformat:** In der Ansicht „Video mit Faktencheck“ erhält der Bereich `data-format="short"`. Der Player steht dann im Format 9:16, höchstens so hoch wie das Fenster, und die Aussagenliste bekommt nebeneinander den übrigen Platz (CSS in `site/style.css`). Einwilligung vor dem Laden, Datenschutzmodus und Synchronisierung bleiben gleich.
- **Kennzeichen „Short“** auf der Startseitenkarte und im Kopf der Videoseite.
- **Faktenampel:** Für Shorts gilt eine eigene Mindestgrundlage, weil sie vollständig erfasst sind und meist nur wenige Aussagen enthalten. Regel und Begründung stehen in [FAKTENINDEX.md](FAKTENINDEX.md).
- `FactSync.youtubeId` erkennt auch `/shorts/`-Adressen, damit eine versehentlich gespeicherte Shorts-Adresse die Video-Ansicht nicht abschaltet.

## Tests

- `node --test site/sync-test.js` (Shorts-Adressen), `site/relations-test.js` (Feld `format`, `isShort`), `site/ampel-test.js` (Ampelregel für Shorts).
- `node site/browser-test.js` prüft lokal mit Playwright, dass ein Short in der Video-Ansicht hochkant dargestellt wird.
