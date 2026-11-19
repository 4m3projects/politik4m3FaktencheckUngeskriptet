# Agentenanweisungen – Politik4M3 Faktencheck Ungeskriptet

## Startseite nach Aktualität

- Bei neuen Folgen das belegte YouTube-Veröffentlichungsdatum in `faktenchecks/<ID>/README.md` als `- Veröffentlichung: JJJJ-MM-TT` erfassen. Ist das Datum ungeklärt, bleibt es ohne Datumswert.
- Bei der Erstanalyse oder einer inhaltlichen Nachprüfung den tatsächlichen Prüfstichtag in `strukturiert/aussagen.json` unter `scope.asOf` pflegen. Reine Format-, Datei- oder Webseitenänderungen setzen ihn nicht hoch.
- Die Startseite sortiert automatisch absteigend nach dem jüngeren Datum aus Veröffentlichung und Faktencheck-Datenstand. Bei Gleichstand zählt die spätere Veröffentlichung. Einträge ohne bekanntes Datum stehen am Ende.

## Transkripte für Video-Faktenchecks

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_TRANSKRIPTION.md](docs/AGENTEN_TRANSKRIPTION.md). Zuerst das Transkript im Originalplayer suchen. Falls es fehlt, kann eine privat abgelegte Audiodatei lokal mit Whisper transkribiert werden. Zeitmarken, Wortlaut und Sprecherzuordnung am Original abgleichen.

## Zuständigkeit für Ungeskriptet

Erstelle, aktualisiere und veröffentliche Faktenchecks zu Interviews von {ungeskriptet} by Ben und zu zugehörigen Reaktionsvideos ausschließlich in diesem Repository. Im Schwesterprojekt verbleibende historische Kopien dienen als Archiv.

## Auftrag
Baue eine eigenständige, möglichst neutrale, faktenorientierte Prüfumgebung für Aussagen aus Interviews von ungeskriptet. Das Projekt ist unabhängig von den untersuchten Personen und Kanälen; keine Kooperation behaupten. Ausgangsbasis: https://github.com/4m3projects/politik4m3Facktencheck

## Dauerhafte Verfahrensregeln für Reaktionsvideos

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_REAKTIONSABGLEICH.md](docs/AGENTEN_REAKTIONSABGLEICH.md). Bei jeder neuen oder geänderten Reaktionsprüfung Originalaussagen erneut abgleichen, übersehene Behauptungen identifizieren, neue Belege unabhängig prüfen und gegebenenfalls den Original-Faktencheck mit nachvollziehbarer Korrekturhistorie verbessern. Anschließend verknüpfte Reaktionen auf veraltete Bewertungen prüfen. Diese Regel gilt allgemein und unabhängig von einzelnen Issues.

## Zwei unabhängige Bewertungsebenen

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_RHETORIK.md](docs/AGENTEN_RHETORIK.md). Die bestehende sachliche Faktenprüfung (einschließlich Meinung/Prognose und aller bisherigen Kategorien) bleibt unverändert. Zusätzlich können Aussagen mit begründeten Rhetorik-Hinweisen wie Abwertung, Ironie oder möglichem Tunnelblick versehen werden. Rhetorische Hinweise verändern weder Wahr/Falsch-Bewertungen noch bestehende Fehlerstatistiken und dürfen nicht automatisch als Fehlerpunkte zählen.

## Prüfstatus: noch nicht geprüft ≠ nicht überprüfbar ≠ nicht belegbar

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_PRUEFSTATUS.md](docs/AGENTEN_PRUEFSTATUS.md). `Offen` heißt ausschließlich „noch nicht geprüft“ und ist ein Arbeitsauftrag, der nachgearbeitet wird. `Nicht überprüfbar` ist ein eigener, abschließender Status nur für Aussagen ohne grundsätzlich öffentliche Prüfgrundlage. `Nicht ausreichend belegbar` ist ein Urteil nach tatsächlicher Recherche mit gelesenen Quellen. Fehlender Zugang, fehlende Zeit oder eine nicht kontrollierte Originalstelle sind nie ein Ergebnis: die Aussage bleibt `Offen`. Bei jeder Arbeit an einem Video zuerst die offenen Aussagen bearbeiten und bestehende Einstufungen ohne Urteil gegen die Regel prüfen.

## Umgang mit fehlenden Belegen

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_RECHERCHE.md](docs/AGENTEN_RECHERCHE.md). Ein fehlender Suchtreffer ist kein Beweis, dass es keine Belege gibt. Vor jeder Einordnung als `Nicht ausreichend belegbar` oder `Nicht überprüfbar` folgt eine zweite, gezielt anders angelegte Recherche (andere Begriffe, Primärquellen, Zeitbezug, indirekte Prüfwege); widersprüchliche Quellen werden dokumentiert. Die Fälle „Quellenlage unzureichend“, „Recherche ohne ausreichendes Ergebnis“, „Derzeit nicht überprüfbar“ und „Kein überprüfbarer Tatsachenkern“ werden intern im optionalen Feld `research` unterschieden, ohne neue Bewertungskategorien. Belegte Aussagen sind vollwertige Ergebnisse. Nur tatsächlich durchgeführte Recherchen dokumentieren, nichts erfinden, Unsicherheit nicht künstlich auflösen. Bestehende Videos werden nur gezielt (Kandidaten über `scripts/Get-RecheckCandidates.ps1`) und erst nach Freigabe durch den Nutzer nachrecherchiert.

## Wissensdatenbank und systemweite Fehlerkorrektur

**Pflichtlektüre für alle Agenten:** [docs/AGENTEN_WISSEN.md](docs/AGENTEN_WISSEN.md). Bei jeder neuen Faktencheck-Recherche zuerst gezielt in der eigenen Wissensdatenbank (und den für das Thema eingetragenen weiteren Wissensdatenbanken) suchen: `node scripts/wissen.js suche "<Behauptung>"`. Vorhandene Prüfungen nur nach eigener Kontrolle der Originalquellen übernehmen; eine frühere KI-Bewertung ist kein Beleg. Neue Aussagen Themen zuordnen und mit Wissenseinträgen verknüpfen. Vermutete Fehler früherer Bewertungen als Korrekturvorgang melden, Betroffene mit `node scripts/wissen.js betroffen` finden und erst nach geprüfter Beweislage und, bei mehr als drei Aussagen oder unklarer Lage, nach Freigabe durch Jens korrigieren. Eine geänderte Faktenlage macht frühere, damals richtige Bewertungen nicht falsch.

## Gegendarstellung aus anderen Videos

**Pflichtlektüre für alle Agenten:** [docs/GEGENDARSTELLUNG.md](docs/GEGENDARSTELLUNG.md). Kritische Aussagen (widerlegt, irreführend, nicht ausreichend belegbar, Meinung/Vermutung, noch ohne Urteil) zeigen automatisch eine belegte Gegenaussage aus einem anderen geprüften Video mit Zeitmarke. Die Zuordnung wird von Agenten gepflegt: Findet ein Agent eine solche belegte Gegenaussage, verknüpft er sie als `gegenbehauptung` in `faktenchecks/beziehungen.json` oder über einen Wissenseintrag (`gleichwertig`/`widerspricht`). Berechnet wird nur in `site/gegendarstellung.js`; keine Bewertung wird dafür geändert.

## Faktenampel

Die Gesamteinschätzung je Video (Ampel) wird **ausschließlich berechnet**, zentral in `site/ampel.js`, aus den vorhandenen Einzelbewertungen. Agenten setzen, speichern oder überschreiben keine Ampel und ändern keine Einzelbewertung, um eine Ampelfarbe zu erreichen. Änderungen an Schwellen oder Regel nur in `site/ampel.js` mit Tests und Dokumentation in [docs/AMPEL.md](docs/AMPEL.md) sowie in der Methodik der Webseite. Darstellungshinweise fließen nie ein; vorläufige Prüfungen bleiben „Noch in Prüfung“.

## Arbeitsweise
- **Keine Videoauswertungen importieren**, bevor der Nutzer die Fertigstellung und Übertragung ausdrücklich freigibt.
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
