# Hank Loose / Naomi Seibt – Arbeits- und Prüfstand

Bearbeitet von: Codex, 18.11.2026. Auftrag: [Issue #10](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/10).

## Zuständigkeit und Grundlage

Eigener Branch `codex/hank-naomi-analyse`, Ausgangscommit `7341daa3bdd64000cd6d318eccc1a9e0a326e702`. Die Nutzeranweisung erlaubt den Merge geprüfter Änderungen nach `main`. Claudes Schema aus #4/#7 wird verwendet; seine Branches, App, CSS, Workflows und beide Originaldatenbestände bleiben unverändert. Die Abstimmung und die gemeinsam berührten Dateien wurden in Issue #10 an Claude adressiert; eine bestätigte Antwort wird damit nicht behauptet.

Neu sind ausschließlich die Gegenprüfung unter `faktenchecks/zUnxDR5ttRU/`, ihre Beziehung zum Naomi-Interview und zusätzliche Tests. Die Startseite führt weiterhin zwei Originalinterviews; die Reaktion wird über Naomi erreichbar. Identifikation direkt über YouTube-oEmbed und Projekt-Importskript. Der Nutzer hat vidIQ-Credits abgelehnt; keine verbraucht. Fremde Untertitel und Metadaten-Rohdateien liegen ausschließlich außerhalb des Arbeitsbaums und werden nicht veröffentlicht.

## Fachlicher Umfang

Die gesamte verfügbare deutsche Textfassung wurde gelesen; zwei identische Spuren sind keine unabhängigen Quellen. 43 Prüfgegenstände: 34 eigene Einträge, acht Fremdbezüge, eine ungeklärte Aussagefunktion. Unter den eigenen Einträgen: neun Meinungen; 25 Tatsachenprüfungen mit 21 begrenzt abgeschlossenen Bewertungen, drei offenen und einer laufenden Prüfung. 14 Quellenverweise einschließlich eines nicht auswertbaren Verweises; nicht alle Quellenverweise sind Sachbelege. 22 nachvollziehbare Verknüpfungen zum Original.

Keine abgeschlossene audiovisuelle Vollanalyse. Die öffentlichen Berichte dokumentieren fehlende Ton-/Bildkontrolle, Textgrenzen, unkontrollierte Wiederholungen, unzugängliche Einzelfallunterlagen und noch ausstehende unabhängige Zweitprüfung. Keine Gesamtfehlerquote, keine Personenbewertung, keine stille Originalkorrektur.

Besonderer Gegenbefund: A0031 dokumentiert die sprachliche Abschwächung von Seibts Dementi zum Aufmerksamkeitsmotiv durch Hank. A0024 bleibt ohne Sprecherzuordnung, weil eine sichere Originalfundstelle fehlt. Keine offene Originalbewertung wurde zur Herstellung von Übereinstimmung umgestellt. Die Gerichtsmitteilung und historischen Vereinbarungen wurden eigenständig gelesen; fehlende Bestätigung der Überwachung wird nicht zu deren Widerlegung.

## Validierung

Lokal ausgeführt und bestanden:

- 22 Synchronisationstests und zehn Beziehungstests einschließlich zweier neuer inhaltlicher Schutzregressionen.
- Zehn Browserprüfungen für Beziehungen, darunter echte Hank-/Naomi-Verknüpfung, Rücklink, Quellenvergleich und mobile Darstellung.
- Publikationsfilter für Arbeitsbaum und Git-Index vor dem abschließenden Vormerken.

Browserprüfungen verwenden Playwright mit extern bereitgestelltem lokalem Chrome. Der erste Start ohne expliziten Chrome-Pfad scheiterte am fehlenden Playwright-Browser; der erfolgreiche Lauf verwendete den vorhandenen Chrome. Alle fremden Browseranfragen sind im Test abgefangen. Dies ist keine Sichtung des echten YouTube-Videos.

Weitere Generator-, Faktencheck-, Browser- und CI-Ergebnisse werden vor dem Merge im PR dokumentiert. Nicht ausgeführte oder noch laufende Prüfungen gelten hier nicht als bestanden.

## Noch erforderlich für eine Vollprüfung

Ton/Bild/Schnitt des gesamten Videos kontrollieren, A0024 sicher zuordnen, A0019 audiovisuell prüfen, Artikelkette A0011 und Zitat A0026 klären sowie relevante Wiederholungen vollständig vermessen. Private Einzelfallbehauptungen benötigen zugängliche belastbare Belege; fehlende Bestätigung allein schließt sie nicht. Eine unabhängige redaktionelle Zweitprüfung steht aus. Issue #10 bleibt wegen dieser Grenzen offen.
