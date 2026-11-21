# Ampel-Audit und Gegenprüfung am 21.11.2026

[Codex], Ausgangsstand `2623c68`. Koordination: [#112](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/112), [#95](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/95). Der Nutzer hat die Bearbeitung offener Aufgaben und Veröffentlichung ausdrücklich freigegeben.

## Ampeln und nächste Arbeit

Reproduzierbar mit `node scripts/ampel-audit.js` oder `--json`. Der Bericht berücksichtigt auch Videos ohne strukturierte Aussagen. Farbe und Index stammen unverändert aus `site/faktenindex.js`; die Diagnose liest dessen Konfiguration und nennt alle gleichzeitig bestehenden Hürden. Sie speichert keine Ampel und ändert keine Schwelle.

Zehn Videos, sieben farbige Ampeln, drei graue Bestände:

| Video | Tatsächlich verbleibende Ampel-Hürde |
| --- | --- |
| Krall `OQnvClWgN-g` | 24 erfasste Tatsachen, mindestens 68 bei 3:21 Stunden: mindestens 44 weitere eigenständige Sachbehauptungen über das ganze Original erfassen und prüfen. |
| Abdel-Samad `QxMuH1bjMwo` | 49 erfasste Tatsachen, mindestens 67: mindestens 18 weitere erfassen und prüfen; Analyse läuft weiterhin. |
| Schmidt-Salomon `Xw2tAp6UouE` | Noch keine strukturierten Aussagen; laufender Auftrag #111. Die bereits dokumentierten Quellenhinweise sind keine strukturierte Vollprüfung. |

Die Mindestzahlen sind rechnerische Untergrenzen, kein Nachweis einer vollständigen oder repräsentativen Erfassung. Keine Aussage wird aufgespalten, wiederholt oder umbewertet, um eine Farbe zu erhalten. Die übrigen sieben Videos haben bereits farbige Ampeln; vorhandene offene Einzelprüfungen bleiben dennoch Arbeitsaufträge.

Im öffentlichen Prüfstand und auf der Seite der Prüfschritte stehen nun alle Ampel-Hürden. Eine sachlich bereits bewertete Aussage mit ungeklärter Zurechnung zum Video bleibt als eigener Arbeitsauftrag verlinkt; bisher fehlte sie in dieser Liste. Sachprüfung und Zurechnung bleiben getrennt.

## Bedeutungsfaktoren der Reaktionsvideos

65 unabhängige redaktionelle Kontrollen: alle 50 vorhandenen Faktoren ungleich 1 der fünf Reaktionsvideos sowie jeweils drei Standardfaktor-Stichproben. Grundlage waren die dokumentierten eigenen Paraphrasen, Fundstellenkontexte, Titel und Prüfberichte. Keine neue Wiedergabe des Originals, keine audiovisuelle Vollkontrolle und keine erneute Sachquellenprüfung. Diese Kontrolle bestätigt ausschließlich die nachvollziehbare redaktionelle Bedeutung im dokumentierten Aufbau, keine Faktenurteile oder Sprecheridentitäten.

| Video | Kontrollen | bestätigt | abweichend |
| --- | ---: | ---: | ---: |
| Alfred/Seibt `BOIqGtGuShM` | 9 | 6 | 3 |
| Politik4M3/Krall `L7E04TJtRBU` | 9 | 8 | 1 |
| Alfred/Krall `qQAcmDzd9O8` | 18 | 13 | 5 |
| Alfred/Lüning `sLMyP0H7tSY` | 19 | 11 | 8 |
| Hank/Seibt `zUnxDR5ttRU` | 10 | 7 | 3 |
| Gesamt | 65 | 45 | 20 |

Bestätigte Faktoren heißen nun `Gegengeprüft`. 20 abweichende Einschätzungen heißen `Strittig`; bisheriger Faktor und frühere Begründung bleiben erhalten. Jeder Review nennt einen konkreten Grund und einen vorgeschlagenen Faktor. Der Statuswechsel ist in `factIndex.history` dokumentiert. Es wurden **keine Faktoren, Anteile, Sachurteile, Prüfstatus, Prüfstichtage oder Videostatus geändert**; alle berechneten Indizes und Farben sind identisch zum Ausgangsstand.

Besonders geprüft: Aussagen über Auswahlumfang, unabhängige Mehrfachprüfung, Fehlerhäufigkeit und Indexpunkte sind sachliche Grundlagen einer behaupteten Gesamtbewertung und nicht automatisch nebensächliche Macharthinweise. Die technischen und historischen Belege im Whisky-Fotoverbots-/Fasskomplex tragen einen der vier tatsächlichen Vergleichsfälle; eine pauschale Herabsetzung auf Anekdoten ist nicht hinreichend begründet. Hinweise auf Bens Verhalten tragen teilweise die ausdrücklich behandelte Moderationskritik. Bei diesen Fällen schlägt Codex normale Bedeutung vor, ohne einen Konsens vorzutäuschen.

Offen in #95 bleiben die vier Originalinterviews und die öffentliche Klärung der 20 abweichenden Einschätzungen mit dem Erstprüfer. Die fünf Reaktionsabschnitte sind kontrolliert; der Gesamtauftrag ist damit noch nicht erledigt.

## Technische Prüfung

151 bestehende Node-Tests vor der Änderung bestanden; mit neuen Arbeitsdiagnose- und Anzeigeprüfungen 159 bestanden. Außerdem bestanden: 117 PowerShell-Regressionsfälle, Generator-Prüfmodus für alle neun strukturierten Videos, Publikationsfilter, Wissensdatenbank-Validierung und Änderungskontrolle sowie 71 Browserprüfungen (24 Player/Navigation einschließlich Ampel-Hürden, 17 Beziehungen, 12 Darstellungshinweise, 18 Themen/Wissen). Commit, PR und Deployment werden im PR dokumentiert; dieser Bericht nimmt die Veröffentlichung nicht vorweg.

Die Browserprüfung fand veraltete Testannahmen, die behoben wurden: Lüning muss nach abgeschlossener Restrecherche keine offenen Aussagen mehr haben; der Prüfstand enthält auch neue Videos ohne Aussagen; Kanal-Ranglistenlinks sind keine Originalvideolinks; der Themen-Testaufbau darf fehlende strukturierte Daten nicht als vorhanden melden. Der Scrolltest berücksichtigt den vorgesehenen CSS-Abstand von 80 Pixeln und Subpixelrundung, statt genau diesen korrekten Abstand zurückzuweisen. Die Funktionen wurden nicht zur Erfüllung veralteter Tests verändert.

Neue Tests prüfen insbesondere gleichzeitige Hindernisse, ungeklärte Zurechnung trotz Sachurteil, Kurzformate, fehlende Daten, leere Projekte, unveränderte zentrale Ampelergebnisse und maskierte HTML-Ausgabe. Der Browser prüft beide Dichtelücken und die mobile Darstellung. Keine Rohtranskripte, Medien oder fremden Quellentexte veröffentlicht.
