# Krall: Prüfprotokoll zu Issue #13

[Codex], begonnen am 18.11.2026. Eigenständiger Auftrag, Branch `codex/krall-vergleich`, separater Worktree ab `c914aa3`. Merge geprüfter Änderungen vom Nutzer erlaubt; Issue bleibt bei offenen Inhaltsprüfungen offen.

## Identifikation

| Rolle | Video | Kanal | Grundlage |
| --- | --- | --- | --- |
| Original | [Das Ende von Deutschland steht bevor (Markus Krall)](https://www.youtube.com/watch?v=OQnvClWgN-g) | {ungeskriptet} by Ben | YouTube-oEmbed und vorhandene Uploadmetadaten |
| Externer Faktencheck | [Wächst das Eis am Südpol? Markus Krall bei Ungeskriptet](https://www.youtube.com/watch?v=qQAcmDzd9O8) | Alfred räumt auf | YouTube-oEmbed; Beschreibung verlinkt ausdrücklich das Original |
| Projektverantwortlicher | [Politik4M3 Faktencheck: Markus Krall bei ungeskriptet Fakten, Fehler und Behauptungen](https://www.youtube.com/watch?v=L7E04TJtRBU) | Politik4m3 | YouTube-oEmbed; Beschreibung verlinkt beide anderen Videos |

Alle drei Zuordnungen am 18.11.2026 geprüft. Politik4M3 nennt einen anderen Alfred-Titel; ein historischer Titelwechsel wird damit nicht bewiesen. Keine Zusammenarbeit mit Alfred, Sinan oder ungeskriptet unterstellt.

## Vorarbeiten und Zugangsgrenzen

In den getrackten lokalen Beständen beider Repositories zunächst keine Krall-Auswertung gefunden. Außerhalb von Git existiert eine eigene frühere Auswertung vom 14.11.2026: 178 unterschiedlich umfangreiche Prüfpositionen in 26 redaktionellen Kapiteln. Sie bezeichnet sich ausdrücklich als Transkriptprüfung, nicht als vollständige audiovisuelle Verifikation. Diese Gruppenzahl ist weder die Anzahl atomarer Behauptungen noch die Zahl falscher Aussagen. Vorhandene Begründungen dienen als Arbeitsgrundlage, nicht als neue Belegprüfung.

Die deutschen automatischen Textfassungen beider Reaktionsvideos wurden über das vorhandene Importskript ausschließlich außerhalb des Arbeitsbaums abgelegt. Politik4M3: Deutsch erfolgreich, Englisch mit HTTP 429 fehlgeschlagen. Alfred: Deutsch erfolgreich. Keine fremden Quellenfassungen, Kontodaten aus Beschreibungen oder Medien werden übertragen.

## Koordination

- [Issue #13](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/13): Zuständigkeit und drei verifizierte URLs dokumentiert.
- [Issue #10](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/10): anderer Codex-Arbeitsstrang über getrennten Worktree informiert. Seine ungesicherten Änderungen bleiben unberührt.
- Schema aus #4/#7 verwenden; bestehende Originalbewertungen nicht überschreiben. Beziehungen nur additiv und mit fallbezogenen stabilen IDs ergänzen.

## Veröffentlichbarer Teilstand

109 eigene Prüfdatensätze: 30 Originalreferenzen, 43 Alfred-Prüfgegenstände und 36 Politik4M3-Prüfgegenstände. Erster veröffentlichter Stand: 75 abgeschlossene Sachkern-/Meinungseinordnungen und 34 laufende Prüfungen. [Quellenfortsetzung](KRALL_QUELLEN_FORTSETZUNG.md): drei offene Alfred-Angaben zusätzlich bestätigt, damit 78 abgeschlossen und 31 laufend. Diese Mengen sind keine Fehlerzahlen und erlauben keine Gesamtvideoquote. 51 Aussagebeziehungen in R1301/R1302; bestehende R0001 und R0010 einschließlich aller 60 Beziehungen aus den anderen Aufträgen erhalten.

Die gemeinsame [Vergleichsansicht](https://4m3projects.github.io/politik4m3FaktencheckUngeskriptet/#/video/OQnvClWgN-g/bericht/vergleich.md) stellt Original, Alfred und Politik4M3 gegenüber. Jede eigene Analyse bleibt separat. Nur das Original erscheint auf der Startseite; beide Reaktionen und der gemeinsame Vergleich sind über den Reaktionen-Reiter erreichbar. Eine fehlende Zuordnung bedeutet keine Zustimmung oder Widerlegung.

Die [historische eigene Vorarbeit](arbeitsstaende/krall/vorarbeit-2026-11-14.md) erhält alle 178 Gruppenpositionen mit Hash, alten Bewertungen und damaligen Recherchehinweisen. Sie wird nicht als neue abgeschlossene Einzelprüfung gezählt. Keine fremden Texte oder Medien übernommen.

## Rückabgleich und Korrekturverlauf

Die auf main neu eingeführten Pflichtregeln `AGENTEN_REAKTIONSABGLEICH.md` und `AGENTEN_RHETORIK.md` wurden vor der Integration gelesen. Bestehende Fremdfälle und deren Sachbewertungen bleiben unverändert. Die neuen Originaldatensätze enthalten die frühere Gruppenbewertung, den heutigen Status und den alten Suchlokator in ihrer Herkunftsnotiz; die vollständige alte Begründung bleibt im historischen Register.

| Anlass | Originalanpassung | Folgeabgleich |
| --- | --- | --- |
| Alfred: Eis | Antarktis-Rekord und Grönland-Massenbilanz aus V14-15.06 getrennt; Messgröße, Region und Jahr berücksichtigt | Beide Reaktionen anhand NASA/IMBIE/NSIDC erneut geprüft |
| Alfred: zitierte Corona-Pauschale und Intelligenzvergleich | Zwei zuvor nicht separat erfasste konkrete Original-Prüfkandidaten A0029/A0030 ergänzt, beide ohne Endurteil | Nur Wiedergabe verknüpft; rhetorische Schärfe erzeugt kein Falschurteil |
| Beide: Wind | Positive Lebenszyklusbilanz unabhängig gegen UBA und Vestas kontrolliert | UBA 2,5–4,5 Monate beim deutschen Referenzmix ist gerundet mit 3–5 vereinbar; andere Systemgrenzen erklären Unterschiede zu Vestas 6,5 Monaten |
| Politik4M3: Kaufkraft | Originalbeträge 6/4,8/1,2 Billionen erhalten; Rechenkorrektur separat von der zu starken Wiedergabe als direkte 22-Prozent-Verlustangabe | Sachlicher Einwand bestätigt, Wiedergabe nur teilweise gestützt |
| Politik4M3: Dollar/Host | Bedingter Goldvergleich, 99-Prozent-Warenkorbaussage, spätere 95-Prozent-Angabe und Bens Einwand separat | Gegenrechnung mit gelesenem CPI; Bens Rückfrage zählt nicht als Gastübernahme |
| Politik4M3: EZB | Frühere Vorarbeit überzeichnete eine Aussage als rechtliche Weisungsgebundenheit. Jetzt tatsächliche Einflussbehauptung offen; Ministerpauschale separat widerlegt | Rechtliches Weisungsverbot wird nicht als Beweis völliger praktischer Einflussfreiheit behandelt |
| Politik4M3: Korallen | Regionale GBR-Belege entscheiden keinen weltweiten Flächen-/Volumenrekord; Originalfrage bleibt offen | Regionaler AIMS-Sachkern bestätigt, globaler und zeitlicher Schluss bleibt offen |
| Politik4M3: Wegzug | Normtext selbst gelesen, Unternehmertum und künftige Ertragserwartung als Kontext erhalten | Richtiger Rechtskern und erweiterte Wiedergabe für alle Auswanderer getrennt |

Keine automatische Angleichung unterschiedlicher Sachfragen; keine erfundenen Konflikte. Die bestehenden Vergleichstypen unterscheiden Ergänzung, Wiedergabe und echte Gegenbehauptung. Konkrete Review-Aufgaben stehen in den Beziehungen und im Vergleich. Rhetorische Bewertungen bleiben eine getrennte optionale Ebene; Alfreds Index wird weder übernommen noch in unsere Faktenstatistik eingerechnet.

## Technische Integration und Prüfung

Eigene Commits/Draft-PR #15 sichern die Zwischenstände. Main bis `b263a53` integriert: Hank-Daten, Reaktionen-Reiter, Vorschaubild-Einwilligung und Scrollverhalten erhalten. JSON-Merge additiv; generische Produktionsänderungen beschränken sich auf vorhandene Vergleichsberichte verlinken, interne Berichtslinks navigieren und lange Vergleichsstatus auf Mobilgeräten umbrechen.

Bereits ausgeführt: 106 PowerShell-Regressionsfälle, Publikationsfilter, Generatorprüfungen und Node-Tests. Der alte Player-Browsertest hatte vor Integration des aktuellen main drei Fehler; nach Übernahme der bereits dort korrigierten Tests alle 20 bestanden. Ein neuer Mobiltest fand einen 14-Pixel-Überlauf durch den langen offenen Vergleichsstatus; CSS-Umbruch korrigiert. Die abschließenden Zahlen und CI-/Deploy-Nachweise werden im PR und Issue ergänzt.

Reproduzierbare lokale Prüfungen:

- `./scripts/Test-Factcheck.ps1` und `./scripts/Test-Publication.ps1`.
- `./scripts/Build-Factcheck.ps1 -VideoId <ID> -Check` für jeden vorhandenen Bestand.
- `node --test site/relations-test.js site/sync-test.js` (Fallregressionen werden über den bestehenden CI-Einstieg geladen).
- Mit extern installiertem Playwright/Chromium: `node site/relations-browser-test.js`, `node site/browser-test.js`, `node site/krall-browser-test.js`.

Keine Zusatzabhängigkeit in die Anwendung eingebracht. Browseraufbau/Screenshots und Quelldaten ausschließlich außerhalb des Git-Arbeitsbaums.

## Offene redaktionelle Arbeit

- Vollständige audiovisuelle Kontrolle aller drei Videos, einschließlich Sprecher-/Schnittidentität, Grafiken und Einblendungen. Es liegt bisher eine Textprüfung vor.
- Originalinterview über die ausgewählten Stellen hinaus atomar erfassen; der historische Gruppenstand ersetzt dies nicht.
- Alfred: Originalwortlaut der Vorhersage 2019, Mai-2020-Interview und Maßnahmenchronologie, EBA-Kapitalrekord (403), mehrere historische und technische Nebenangaben, Indexkodierungen/Prüferunabhängigkeit.
- Politik4M3: weltweiter Korallenvergleich und genauer Zeitbezug, Ausgangschronologie der Argentinien-Zahlen, begrenzte Genauigkeit einzelner Wiedergaben.
- Verbindlicher Volltext des EuGH-Urteils blieb gesperrt; die inzwischen gelesene amtliche OMT-Presseerläuterung wird als solche benannt und nicht als Urteilsvolltext ausgegeben.
- Unabhängige redaktionelle Zweitprüfung. Dieser Codex-Arbeitsstrang behauptet keine solche Freigabe.

Issue #13 bleibt für diese Punkte offen. Der veröffentlichte Zwischenstand ist ein korrigierbarer Recherchebeitrag, keine abgeschlossene Vollprüfung.
