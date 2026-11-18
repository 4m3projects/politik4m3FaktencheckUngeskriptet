# Veröffentlichung: Umfang und Kontrolle

Die MIT-Lizenz bleibt unverändert. Wir veröffentlichen eigene Projektbeiträge und können keine Rechte an fremden Videos, Untertiteln, Bildern oder Artikeln vergeben.

## Zulässige öffentliche Fassung

Eine Auswertung identifiziert das Video durch Titel, Kanal, ID und Link. Zeitmarken führen zu den Originalstellen. Danach folgt unsere eigene knappe Beschreibung des Prüfgegenstands, unsere Interpretation und unsere recherchierte Bewertung. Die Berichte liefern keine Originalrede oder Untertitelfassung.

Auch extern recherchierte Quellen erscheinen nur als bibliografische Angaben, Links, notwendige Zahlen und eigene Erklärungen. Keine kopierten Passagen, Tabellen, Abbildungen oder PDF-Anhänge. Originalkapitelüberschriften werden durch eigene Themenbezeichnungen ersetzt.

## Was der Agent vor Veröffentlichung prüft

1. Alle Dateien, nicht nur die zuletzt geänderten Texte, auf unzulässige Fremdinhalte durchsehen.
2. Öffentliche Texte mit der privaten Grundlage vergleichen: keine wörtlichen Passagen, keine dichte fortlaufende Wiedergabe und kein verkapptes Transkript.
3. Nur notwendige minimale Metadaten und externe Quellenlinks nennen; Rohdaten und lokale Quellenpfade entfernen.
4. Alle Bewertungen auf tatsächlich gelesene Belege und ehrlichen Prüfstatus kontrollieren.
5. Den technischen Prüfer ausführen und alle Befunde beheben.
6. Vor einem beauftragten Push zusätzlich den vollständigen staged Diff und den bestehenden Verlauf prüfen. Der technische Prüfer untersucht keine vollständige alte Git-Historie.
7. Im Ergebnis offen ausweisen, ob nur lokal vorbereitet, committet oder tatsächlich veröffentlicht wurde.

Wenn Rechte oder Herkunft unklar bleiben, wird der betroffene Inhalt weggelassen. Keine bloße Umbenennung in eine Markdown-Datei und keine Annahme, eine automatische Umformulierung reiche aus.

## Technischer Prüfer

Die erlaubte Dateimenge ist bewusst eng: Root-Dokumente (README.md, AGENTS.md, CLAUDE.md, LICENSE) und Git-Konfigurationstexte, Markdown unter docs/ und faktenchecks/, PowerShell-Skripte unter scripts/ sowie die statische Webseite (HTML, CSS, JavaScript direkt unter site/) und Workflow-Dateien unter .github/workflows/ (siehe [WEBSEITE.md](WEBSEITE.md)). Zusätzlich sind ausschließlich aussagen.json und die daraus erzeugte statistik.json unter faktenchecks/<Video-ID>/strukturiert/ erlaubt. Unbekannte JSON-Felder, fehlende Herkunft, veraltete Artefakte und weitere Dateien in diesem strukturierten Bereich werden zurückgewiesen. Andere Dateitypen und verdächtige Namen werden zurückgewiesen. Zusätzlich werden typische Untertitel-, Rohmetadaten- und private Pfadmuster erkannt. Getrackte, ungetrackte und ignorierte Dateien im Arbeitsbaum werden erfasst; der Git-Index wird ebenfalls geprüft.

Ein Bestehen ist KEINE Garantie gegen Rechteverletzungen. Kurze Zitate in Prosa, zu enge Paraphrasen, falsche Quellenzuordnungen oder externe Veröffentlichung außerhalb dieses Arbeitsbaums lassen sich damit nicht zuverlässig ausschließen. Die inhaltliche Prüfung bleibt erforderlich.

## Private Arbeitsablage

Das Importskript nutzt standardmäßig einen benachbarten Ordner .politik4m3-private mit je einem Unterordner pro Video-ID. Er liegt außerhalb des Git-Arbeitsbaums. Vorhandene private Quellen aus dem früheren Downloadprojekt dürfen dort gelesen werden, werden aber nicht in dieses Repository verschoben. Es ist kein Upload privater Quellen an GitHub vorgesehen.
