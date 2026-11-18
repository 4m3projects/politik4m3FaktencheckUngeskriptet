# Agentenanweisungen – Politik4M3 Faktencheck Ungeskriptet

## Auftrag
Baue eine eigenständige, möglichst neutrale, faktenorientierte Prüfumgebung für Aussagen aus Interviews von ungeskriptet. Das Projekt ist unabhängig von den untersuchten Personen und Kanälen; keine Kooperation behaupten. Ausgangsbasis: https://github.com/4m3projects/politik4m3Facktencheck

## Dauerhafte Verfahrensregeln für Reaktionsvideos

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_REAKTIONSABGLEICH.md](docs/AGENTEN_REAKTIONSABGLEICH.md). Bei jeder neuen oder geänderten Reaktionsprüfung Originalaussagen erneut abgleichen, übersehene Behauptungen identifizieren, neue Belege unabhängig prüfen und gegebenenfalls den Original-Faktencheck mit nachvollziehbarer Korrekturhistorie verbessern. Anschließend verknüpfte Reaktionen auf veraltete Bewertungen prüfen. Diese Regel gilt allgemein und unabhängig von einzelnen Issues.

## Zwei unabhängige Bewertungsebenen

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_RHETORIK.md](docs/AGENTEN_RHETORIK.md). Die bestehende sachliche Faktenprüfung (einschließlich Meinung/Prognose und aller bisherigen Kategorien) bleibt unverändert. Zusätzlich können Aussagen mit begründeten Rhetorik-Hinweisen wie Abwertung, Ironie oder möglichem Tunnelblick versehen werden. Rhetorische Hinweise verändern weder Wahr/Falsch-Bewertungen noch bestehende Fehlerstatistiken und dürfen nicht automatisch als Fehlerpunkte zählen.

## Arbeitsweise
- **Keine Videoauswertungen importieren**, bevor der Nutzer die Fertigstellung und Übertragung ausdrücklich freigibt. Der derzeit im Schwesterprojekt bearbeitete Faktencheck bleibt dort, bis Claude seine Arbeit beendet und der Stand geprüft ist.
- Bei neuen Prüfungen einzelne nachprüfbare Tatsachenbehauptungen mit Video-ID, Zeitmarke, Sprecher, Kontext, Belegen, Gegenbelegen, Prüfstatus und Begründung erfassen.
- Aussagen des Gasts, Fragen des Hosts und Aussagen Dritter strikt trennen. Den Host nicht für unkommentierte Behauptungen des Gasts verantwortlich machen.
- Bewertungen anhand nachprüfbarer Evidenz, nicht politischer Übereinstimmung. Korrekte Aussagen genauso erfassen; keine künstliche Fehlerquote. Ungeprüft ist nicht falsch; Stichproben nicht als vollständige Video-Statistik darstellen.
- Primärquellen bevorzugen; Datum, Reichweite, Unsicherheiten und mögliche Gegenbelege dokumentieren. KI-Ergebnisse redaktionell prüfen. Meinungen nicht als Faktenfehler zählen.
- Veröffentlichung nur mit eigenen Paraphrasen, Zeitmarken und Quellenlinks. Keine fremden Transkripte, Untertitel, Audio/Video, Screenshots, Artikeltexte, Rohdaten oder vertraulichen Informationen in Git, Issues oder PRs.
- Technische Basis zuerst prüfen und Altannahmen beseitigen. Keine Tests als bestanden bezeichnen, die nicht ausgeführt wurden.
- Bei mehreren Agenten GitHub-Issues/PRs zur Koordination verwenden. Jeder Agent kennzeichnet seine Beiträge als [Claude], [Codex] oder [ChatGPT] und nennt bei Reviews den Commit. Doppelarbeit vermeiden.
- Für Entwicklungsänderungen eigenen Branch und Draft-PR nutzen. **Kein Merge nach main ohne ausdrückliche Freigabe des Nutzers.** Bestehende Dateien nicht ungefragt überschreiben.
- Öffentliches Projekt soll transparent und korrigierbar sein. Externe Mitwirkung ist perspektivisch möglich, aber keine bestehende Kooperation unterstellen.

## Erster technischer Auftrag
Prüfe die bereits kopierten Skripte, ihre Abhängigkeiten und die Dokumentation. Sorge dafür, dass ein leeres Projekt ohne Videodaten korrekt funktioniert. Erstelle eine neutrale GitHub-Pages-Startseite und Tests, aber importiere keine Videos. Melde Blocker, dokumentiere die Prüfung und öffne einen Draft-PR zur Freigabe.
