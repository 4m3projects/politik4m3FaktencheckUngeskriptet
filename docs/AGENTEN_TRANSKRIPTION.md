# Transkripte für Video-Faktenchecks

## Original zuerst

1. Öffne das konkrete YouTube-Video. Klappe die Beschreibung mit „mehr“ aus und wähle „Transkript anzeigen“. Prüfe Sprache, Zeitachse und sichtbare Lücken. Eine leere Antwort der Untertitel-Schnittstelle sagt nichts darüber aus, ob das Transkript im Player angezeigt wird.
2. Nutze nach Möglichkeit die Originalsprachspur. Von YouTube als automatisch gekennzeichnete Untertitel können Wörter, Zahlen und Namen verwechseln. Sie weisen Personen häufig nicht zuverlässig zu. Nutze sie für die Suche nach Stellen und prüfe strittige Passagen, Sprecherwechsel, Rückfragen, Zitate und Wiederholungen am Originalton und, wo nötig, im Bild.
3. Halte je Aussage fest, welche Textfassung und welche Originalstelle du tatsächlich geprüft hast. Übernimm nur eigene Paraphrasen, Quellenlinks, Zeitmarken und Prüfergebnisse in das Projekt. Wenn die Originalstelle weder im Video noch im Originaltranskript kontrolliert werden konnte, bleibt die Aussage offen. Kennzeichne eine allein aus dem Gesprächskontext abgeleitete Sprecherzuordnung im Datenmodell als plausibel oder ungeklärt.

## Lokaler Ersatz mit Whisper

Wenn der Player und der optionale Import vorhandener YouTube-Untertitel keine ausreichende Textfassung liefern, verwende eine rechtmäßig bezogene lokale Audiodatei, zum Beispiel eine vom Herausgeber im Podcast-Feed angebotene MP3. Eine einzelne Video-URL ist kein Auftrag zum Herunterladen von Medien. Lege Audio und Transkripte außerhalb aller Git-Arbeitsbäume ab.

Voraussetzungen sind die lokale [OpenAI-Whisper-CLI](https://github.com/openai/whisper#setup) und FFmpeg im PATH. Die CLI verarbeitet die Audiodatei lokal. Beim ersten Start kann sie Modellgewichte herunterladen. In PowerShell im jeweiligen Repository ausführen:

```powershell
./scripts/Transcribe-PrivateAudio.ps1 -AudioPath 'C:\private\folge.mp3' -VideoId '<YouTube-ID>' -Language de
```

Das Skript gibt den Pfad zu einer privaten SRT-Datei im Schwesterordner `.politik4m3-private` aus. `-WhisperPath` erlaubt eine abweichende Installation. `-Model` wählt das Modell, voreingestellt ist `small`. Jeder Lauf schreibt in ein eigenes Verzeichnis. Das Skript benötigt keine API-Zugangsdaten und lädt keine Medien herunter.

- Whisper liefert ungefähre Zeitmarken und keine verlässlichen Sprecheridentitäten. Kontrolliere relevante Passagen, insbesondere bei Sprechüberlappung, Nebengeräuschen, Zahlen, Namen und Verneinungen. Weise Sprecher erst nach Abgleich von Stimme, Bild oder eindeutiger Gesprächsrolle zu und dokumentiere die Grundlage. Bei unklarer Zuordnung bleibt das Datenfeld offen.
- Podcast- und YouTube-Schnitt können etwa durch Werbung voneinander abweichen. Prüfe die Zuordnung an mehreren Stellen. Verlinke nur Zeitmarken, die auf die Originalvideofassung bezogen sind. Markiere ungefähr eingegrenzte Stellen entsprechend.
- Dokumentiere die Textgrundlage als „lokale automatische Whisper-Transkription“ mit Sprache, Modell und Bereichen, die du gegen das Original kontrolliert hast. Eine unbearbeitete Spur ist Arbeitsmaterial. Veröffentlicht werden die eigenen Paraphrasen und Sachprüfungen.
