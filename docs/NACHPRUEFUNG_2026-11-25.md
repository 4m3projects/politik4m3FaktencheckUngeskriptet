# Quellenbasierte Nachprüfung vom 25. November 2026

[Codex] Nutzerauftrag: möglichst viele offene Prüfaufgaben bearbeiten; Veröffentlichung ausdrücklich freigegeben. Basis `888cee9`, eigener Branch `codex/nachpruefung-20261125`. Offene PRs, die Koordinationsaufträge und vorhandene Arbeitsstände wurden vor Beginn gelesen. Kein anderer Arbeitsbaum wurde bearbeitet.

## Originale und Quellen

Das Kurz-Interview wurde im Originalplayer geöffnet, stummgeschaltet, die Beschreibung ausgeklappt und das deutsche automatische Transkript angefordert. Die Originaltextfassung wurde ausschließlich privat außerhalb des Repositorys exportiert. Die bearbeiteten Stellen wurden mit Vor- und Nachlauf gelesen. Es gab keine Hörkontrolle, daher bleiben Sprecher plausibel und Zeiten ungefähr. Auch die Originaltexte von Krall und Schmidt-Salomon wurden erschlossen; daraus wurden in diesem Durchgang keine ungeprüften neuen Urteile veröffentlicht.

Vor den Sachrecherchen erfolgten mehrere gezielte Suchen in UG und der lokal eingebundenen HP-Wissensdatenbank. Sachquellen wurden selbst geöffnet und die relevanten Absätze gelesen. Gescheiterte Abrufe von IOM, Justiz-PDF und FMA-Bericht sind keine gelesenen Belege. Der große vollständige Rechnungsabschluss konnte im Webwerkzeug nicht geladen werden; gelesen wurde stattdessen die zugängliche Analyse des parlamentarischen Budgetdienstes. Hersteller- und Unternehmensangaben sind als solche kenntlich gemacht.

Die parallele Hautpflegewerbung im Lüning-Original wurde zusätzlich direkt im privaten Originaltext bei 01:59:19–02:00:35 kontrolliert. Die AAD-Erläuterung und der Abstract der kontrollierten Untersuchung von Ghadially et al. wurden neu gelesen. Keine private Datei und kein fremder Volltext wird veröffentlicht.

## Umgesetzte Arbeit

- Kurz A0031–A0050: 20 zusätzliche Sachbewertungen — zwölf belegt, vier teilweise belegt und vier mit fehlendem Kontext. Belegte Reformen und biografische Verbindungen wurden genauso erfasst wie notwendige Einschränkungen. Neue Aussagen verteilen sich über Institutionen, Bildung, Asylverteilung, Regierungspolitik, Koalitionsbildung, Personalwechsel, Cyberangriffe und zwei Werbepassagen.
- A0051: persönliche Schlusswertung als Meinung getrennt. A0052: eigenständige kausale Behauptung zur Asylzielwahl offen erfasst; die Antragsverteilung beweist kein individuelles Motiv.
- A0015: nach zwei verschiedenen Recherchedurchgängen von offen in nicht überprüfbar überführt, weil die behaupteten vertraulichen Anrufer unbenannt bleiben. Frühere Begründung und Status bleiben in `migration.assessmentChange` erkennbar. Kein Wahr/Falsch-Urteil vergeben.
- A0024: zeitnahe Berichte vom August und Oktober 2026 ergänzt. Kein tagegenauer Nachweis für den 10. November, daher weiter offen. A0011 und A0028 bleiben ebenfalls offen; die Zahlenfassung beziehungsweise die weitergehende Gerichtsäußerung wurden nicht kontrolliert bestätigt. Das bestehende Urteil A0012 wurde nicht geändert; die erneut gescheiterten IOM-Abrufe wurden nicht als neue Quellenlektüre dokumentiert.
- Themen und Wissenseintrag UG-K0011 verknüpfen den erneut geprüften Hautpflege-Sachkern mit Lüning A0287. Dort bleiben Sachurteil, Gewicht, Originaldaten und Prüfstichtag unverändert. Keine belegte Gegenaussage in einem anderen geprüften Video gefunden, daher kein Gegenbehauptungslink erfunden.

Alle vorher abgeschlossenen Kurz-Sachurteile bleiben erhalten. Die bisherigen Standardgewichte 1 sind nun ausdrücklich vorläufig dokumentiert; zwei neue Werbesachkerne erhalten gemäß dem bereits verwendeten Maßstab 0,5. Für Faßmann sind die belegte Berufung aus der Universitätsleitung und der falsche Amtsrang getrennt in den Anteilen erläutert. Gewichte und eigene Anteile brauchen weiterhin unabhängige Kontrolle. Keine Änderung von Indexformel, Mindestabdeckung, Mindestdichte oder Farbschwellen.

## Berechneter Stand und Grenzen

52 Kurz-Prüfgegenstände: 45 abgeschlossene Sachbewertungen, vier offene Sachprüfungen, eine private nicht öffentlich überprüfbare Erzählung und zwei Meinungen. Der erweiterte Teilbestand ist als Rechercheetappe geprüft; das ist kein Abschluss jeder Aussage des Interviews. Nicht erfasste Produkt-, Preis-, Wirkungs- und Förderversprechen sowie weitere Nebenbehauptungen werden nicht als geprüft ausgegeben.

Mit den unveränderten Regeln berechnet das Audit zehn farbige und zwei graue Ampeln bei zwölf Videos. Kurz erreicht einen Faktenindex von 0,755 und 91 Prozent angezeigte Prüfabdeckung der erfassten relevanten Aussagen. Die Ampel wird gelb berechnet. Krall bleibt wegen fehlender Erfassungsbreite und Schmidt-Salomon wegen des kleinen Bestands berechtigt grau. Die rechnerischen Mindestlücken sind keine Aufforderung, Wiederholungen oder Nebensächlichkeiten zum Auffüllen zu zählen.

Es bestehen keine Reaktionsverknüpfungen zum neu erfassten Kurz-Interview. Der allgemeine Folgeabgleich führt deshalb zu keiner veränderten Reaktionsbewertung. Frühere andere Originalchecks wurden nicht pauschal neu bewertet. Die offene Lüning-Korrektur UG-C0004 bleibt ein eigener Prüfauftrag.

## Validierung

- 181 Node-Regressionstests bestanden. Der erste Start in der eingeschränkten Umgebung scheiterte am Starten der Test-Unterprozesse; danach bestanden 180 Tests direkt. Der verbleibende Verlaufstest scheiterte an Gits Dateisystem-Eigentumsprüfung und bestand zusammen mit allen neun Verlaufstests nach einer ausschließlich prozessbezogenen Freigabe des konkreten Arbeitsverzeichnisses. Keine globale Git-Konfiguration geändert.
- 117 PowerShell-Regressionstests bestanden, einschließlich Status-, Quellen-, Migrations-, Generator- und Publikationsregeln.
- Alle zwölf strukturierten Videobestände mit `Build-Factcheck.ps1 -Check` abgeglichen; keine Abweichung.
- `node scripts/faktenindex.js pruefen`, `node scripts/wissen.js pruefen`, `node scripts/wissen.js aenderung --basis origin/main` und `git diff --check` bestanden. Der vorhandene Prüfauftrag UG-C0004 bleibt ausdrücklich offen.
- Der technische Dateifilter prüfte 350 Arbeitsbaumdateien und den Git-Index ohne Fund. Das ersetzt keine redaktionelle Quellenprüfung. Nach dem Vormerken der endgültigen Dateien wird die Publikationsprüfung nochmals ausgeführt.
- Keine Webseitenlogik oder Testdatei geändert; keine Browser-Oberflächentests ausgeführt. Die Live-Auslieferung wird nach erfolgreicher CI und dem freigegebenen Merge separat kontrolliert.
