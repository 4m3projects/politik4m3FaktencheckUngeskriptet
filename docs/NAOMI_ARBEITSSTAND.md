# Übernahme und Arbeitsstand: Naomi-Seibt-Interview

## Aktuelle Fortsetzung auf Nutzerauftrag, 19.11.2026

[Codex] Der Nutzer hat ausdrücklich die Wiederaufnahme und Abschlussnachprüfung des Originals beauftragt. Die frühere Übergabe ist damit kein Verbot weiterer Arbeit. Koordination: [Issue #75](https://github.com/4m3projects/politik4m3FaktencheckUngeskriptet/issues/75), Branch `codex/naomi-abschlusspruefung`, Ausgangsbasis `8205fdccb78cf2a267aa84e7b943f2ef601cae91`; beim Beginn keine offenen konkurrierenden PRs. Nur freie Quellen, keine vidIQ-Credits.

Maßgeblicher aktueller Prüfstand: [Nachprüfung am Original](../faktenchecks/mdo14671BPE/05_nachpruefung.md) und generierte Statistik. 251 Prüfgegenstände, 212 eigene Tatsachen: 107 mit Rechercheurteil, 103 begründet nicht überprüfbar, zwei offen; 37 Meinungen/Prognosen. Alle zwölf zuvor offenen Einträge nachbearbeitet, zwei vollständige Buchprüfungen bleiben offen. Drei öffentliche Sachkerne und eine veraltete Amtszeitbegründung mit Korrekturverlauf verbessert. Zwei allgemeine Asylbehauptungen aus dem zuvor textfreien Fenster zusätzlich erfasst.

Zwei private lokale Whisper-Arbeitstexte der Originaltonpassage ergänzen die Untertitellücke; keine menschliche Hör-/Sichtkontrolle und keine bestätigten Sprecher. Keine vollständige Gesamtabdeckung behaupten. Am 20.11.2026 wird der Entwurf aus PR #79 mit dem aktuellen Hauptstand integriert und erneut technisch geprüft. Die aktuelle ausdrückliche Nutzerfreigabe erlaubt die sofortige Veröffentlichung veröffentlichungsfähiger Ergebnisse einschließlich Merge. Die zwei Buchprüfungen bleiben offen; ein Gesamtabschluss wird nicht behauptet.

## Historischer Übergabestand

Bearbeitet von: Codex. Aktualisierung: 18.11.2026. **Teilprüfung; vollständige Projektverantwortung an Claude übergeben. Keine fertige Gesamtprüfung.**

Die aktuelle Nutzeranweisung zur vollständigen Übergabe wurde aus dem parallelen Codex-Chat übermittelt. Codex sichert den begonnenen Abschnitt und stellt anschließend die fachliche Weiterbearbeitung sowie eigene Merges ein. Claude übernimmt Recherche, Integration und weitere Veröffentlichungen nach den dokumentierten Nutzerfreigaben. Letzten geprüften Commit und Freigabe des Worktrees im Abschlusskommentar von Issue #3 prüfen. Kein automatischer Neustart dieses Codex-Arbeitsstrangs.

## Stand nach Übernahme durch Claude (18.11.2026)

Bearbeitet von: Claude. Claude trägt die Verantwortung für diesen Auftrag. Der Projektverantwortliche hat Claude erlaubt, geprüfte Teilstände bei grüner CI selbst nach `main` zu mergen.

- **Kein Zugriff** auf die privaten Originaluntertitel, Audio oder Video. Neue Aussageerfassung, Wiederholungsabgleich am Text und Sprecherbestätigung sind deshalb derzeit nicht möglich. Kontextfragen stützen sich auf die Paraphrasen in `aussagen.json` und auf Codex' Präzisierungen in Issue #3 (Kommentar 6970629170).
- Lokal steht kein PowerShell zur Verfügung. Die Artefakte erzeugt der Workflow `.github/workflows/regenerate.yml`, wenn eine Commit-Nachricht auf einem `claude/**`-Branch `[regenerate]` enthält. Er führt vorher Generator-Check, Faktencheck-Tests und Publikationsprüfung aus.
- Die Recherchepakete 1–3 aus Issue #3 sind eingearbeitet. Abgeschlossen wurden A0039, A0041, A0060, A0063, A0064, A0065, A0185, A0188, A0191 und A0193. A0056, A0059, A0175 und A0182 haben neue Quellen erhalten, bleiben aber offen.
- Paket 4 (öffentliche Quellen S106–S111): A0109 (PCR-Vortrag laut Correctiv am 10.10.2020, nicht im Plenum) und A0231 (Trusted Flagger, Verfassungsschutz) abgeschlossen. A0073 (Molyneux, nur Alex Jones belegt) und A0106 (Kanallöschung laut Bericht Mai 2021) sind in Bearbeitung.
- Abschlussrecherche (S112–S127): A0001, A0074, A0175, A0178, A0182, A0198, A0223 und A0246 abgeschlossen. Zwölf Wertungen und Motivunterstellungen als Meinung eingeordnet (A0048, A0070, A0101, A0108, A0156, A0180, A0183, A0201, A0213, A0216, A0242, A0248). Alle übrigen offenen Tatsachen tragen am Anfang der Begründung eine Kennzeichnung „Nicht überprüfbar“ bzw. „Nicht überprüft“ mit Grund (persönliche Darstellung, nicht öffentlicher Vorgang, keine zugängliche Quelle, Behauptung über Dritte, zu unbestimmt, Originalstelle nicht kontrolliert). Es wurde nicht auf „Nicht ausreichend belegbar“ umgestellt, um keine Abschlusszahl zu erzeugen. Auf Anweisung des Projektverantwortlichen: Nicht Überprüfbares markieren, nicht raten.
- Teilstand mit 71 abgeschlossenen Tatsachen als Merge-Commit `fcb8dde` in `main` (PR #12, Pages-Deploy erfolgreich). Folgestände über neue PRs vom selben Branch.

- Nachprüfung nach Issue #3 (Kommentar 6975091438): Themenprüfung, Werbe-Korrektur und Restliste in [NAOMI_ABGLEICH.md im Schwesterprojekt](https://github.com/4m3projects/politik4m3Facktencheck/blob/main/docs/NAOMI_ABGLEICH.md). Die ältere 328-Punkte-Auswertung liegt weiterhin nicht vor.

Die folgenden Abschnitte dokumentieren Codex' Übergabestand.

## Zuständigkeit und Wiederaufnahme

- Auftrag: [Issue #3](https://github.com/4m3projects/politik4m3Facktencheck/issues/3), [Erste Teilveröffentlichung PR #5](https://github.com/4m3projects/politik4m3Facktencheck/pull/5), [Folge-Draft PR #10](https://github.com/4m3projects/politik4m3Facktencheck/pull/10).
- Eigener Branch: `codex/naomi-recherche-fortsetzung`; benachbarter Worktree mit Namen `politik4m3-naomi`. Den Arbeitsbaum des Migrations-Chats nicht verwenden.
- Veröffentlichte Ausgangsbasis: Merge-Commit `84c6a5f42759a1d88d166b540393859f6a41edec`, Kandidat `5d90003602161881896437134542ee0bc596f4c5`. Pages-Build und Deploy 44246032430 erfolgreich. Der aktuelle Folgebranch enthält zusätzliche Recherche. Den neueren gesicherten Stand im PR und mit `git log -1` prüfen; lokale Änderungen nicht ungeprüft verwerfen.
- Aktuelle Nutzerfreigabe: [ChatGPTs Dokumentation vom 18.11.2026](https://github.com/4m3projects/politik4m3Facktencheck/issues/3#issuecomment-6970001314). Fertigstellung und Veröffentlichung einschließlich Merge sind für diesen Auftrag autorisiert. Die älteren Einzel-Freigabesätze sind insoweit übersteuert. Quellen-, Rechte- und Testpflichten gelten weiter.
- Abgeschlossener Integrationsschritt: vorhandene Website aus `origin/main` (`d79ec4f`) in den eigenen Branch übernommen und als Teilprüfung veröffentlicht. Kein Rebase mit Force-Push, keine fremden Branchänderungen. Der einzige Konflikt betraf den Kommentar neben der bereits beidseitig erlaubten CLAUDE.md im Publikationsprüfer; Website-Freigaben aus main erhalten.
- Issue #8 zur Synchronisierung bei YouTube-Werbung ist Claudes gesonderter Auftrag; keine konkurrierende Reparatur in diesem Branch.

## Gesicherter fachlicher Stand

Zentrale Daten: [aussagen.json](../faktenchecks/mdo14671BPE/strukturiert/aussagen.json). Berichte und Statistik im Unterverzeichnis `strukturiert` ausschließlich mit dem Generator erzeugen. Eigene Einordnung und Abdeckungsregister stehen eine Ebene darüber.

249 Datensätze, davon zwei reine Fremdbezüge; 247 eigenbezogene Aussagen mit 277 eigenen Vorkommen. 210 Tatsachenbehauptungen: 81 abgeschlossen, 129 als nicht überprüfbar offen, 0 in Bearbeitung (Stand Claude, 18.11.2026; bei Codex' Übergabe 222 Tatsachen mit 61/119/42). 37 Meinungen/Prognosen außerhalb des Tatsachennenners, davon zwölf von Claude aus Tatsachen umgestuft. Werbung ist eine enthaltene Teilmenge, keine zusätzlich zu addierende Menge.

Letzter vor diesem Folgeabschnitt bestätigter Push: `3601fcf88b980c0dde30ba2af341298361f4ad14` (59 abgeschlossene Tatsachenprüfungen). Den SHA des vorliegenden neueren Abschnitts aus dem PR/Issue und dem Git-Log ermitteln; ein Dokument kann seinen eigenen Commit-SHA nicht vorwegnehmen.

## Zusammenarbeit mit Claude

Die Nutzerkorrektur meint ausdrücklich Claude. [Aufteilung](https://github.com/4m3projects/politik4m3Facktencheck/issues/3#issuecomment-6970466955) und [Annahme durch Codex](https://github.com/4m3projects/politik4m3Facktencheck/issues/3#issuecomment-6970485148) stehen im Issue. Claude recherchiert Kapitel 19 (A0182, A0183, A0185, A0188–A0191, A0193), Kapitel 6 (A0055, A0056, A0059, A0060, A0062–A0065), Kapitel 5 (A0039–A0041, A0043, A0044) sowie A0175 und A0178. Er verändert keine Naomi-Dateien. Codex bearbeitet die übrigen Bereiche und integriert nach eigener Quellenlektüre und Kontextprüfung. Die Migration des anderen Chats bleibt getrennt.

Claudes drei Pakete liegen als Issue-Kommentare 6970522056, 6970554111 und 6970599290 vor. Sie sind Hinweise und Bewertungsvorschläge, keine automatisch zu übernehmenden Ergebnisse. Codex hat mit Kommentar 6970629170 die unbestimmten Kontexte zu Wahljahr, Trump-Kontakt, Merz-Bezugsgröße, Wohnort und unbenannten Amtsträgern präzisiert und Primärquellen zum AfD-Programm 2014 sowie Polenz angefragt. Kein privater Originaltext wurde übermittelt. Vor dem Upload veröffentlicht bedeutet bei unbekanntem Aufnahmetermin nicht sicher vor der Aufnahme bekannt.

Alle verfügbaren automatischen deutschen Originaluntertitel wurden gelesen. Beide deutschen Spuren haben dieselbe Lücke bei ungefähr 02:10:48–02:12:44. Letzte vier Sekunden ebenfalls ohne Inhaltsnachweis. Zwei Einträge im Lückenfenster beruhen nur auf einer öffentlichen Podcast-Transkription mit abweichender Zeitachse. Nicht als synchronisiert oder kontrolliert ausgeben. Audio-/Videokontrolle und bestätigte Sprecheridentitäten fehlen vollständig; keine persönlichen Prozentquoten erfinden.

Private Grundlagen ausschließlich in der vom Importskript vorgesehenen externen Ablage verwenden. Keine Pfade, Originalpassagen oder Dateien daraus in öffentliche Berichte, Kommentare, Screenshots oder Build-Ausgaben kopieren. Ein erneuter Import darf vorhandene Quellen nicht überschreiben. Die ältere private 328-Punkte-Auswertung liegt nicht vor und wurde nicht übernommen.

## Konkrete nächste Arbeit

1. Erledigt: Codex hat den Stand `6e78c26` gesichert und übergeben. Claude führt den Auftrag seit 18.11.2026 auf `claude/project-thread-a9k8oo` (PR #12) fort und hat zwanzig weitere Tatsachen nach eigener Quellenlektüre abgeschlossen (S084–S127). Die öffentliche Recherche ist damit abgeschlossen; weitere Fortschritte setzen Zugriff auf Untertitel, Audio oder Einzelfallunterlagen voraus.
2. Noch offene öffentliche Angaben weiter recherchieren, zuerst A0096–A0103 (öffentliche Auftritte, Heartland, Medien), A0072–A0074 (Veröffentlichungen und Plattformgeschichte), A0001–A0005 (Alter, öffentliche Termine, behauptete Vermittlung und kostenloses Folgen), A0168 und A0210–A0231 (konkrete Verfahren und Rechtsbehauptungen). Nicht alles in einem Sammelurteil schließen.
3. A0064 unterscheidet noch nicht sicher zwischen Kontakt zu Epstein und strafbarer Beteiligung. Originalstelle und Belege prüfen; ein Kontakt ist kein Schuldbeweis. A0059 wurde präzisiert: Der Nahkontext beschreibt die Deutung durch Q-Anhänger. Das Wahljahr bleibt offen; erste Q-Beiträge 2017 rechtfertigen ohne diese Klärung kein pauschales Urteil über eine Vorhersage.
4. A0196 wurde nach Kontextprüfung wieder geöffnet: persönlicher Loyalitätsvorsatz und behauptete rechtliche Asylvoraussetzung sind nicht eindeutig dieselbe Aussage. Die frühere Endbewertung nicht ungeprüft wiederherstellen.
5. Private Krankheits-, Missbrauchs-, Familien-, Aufenthalts- und Kostenberichte erfordern geeignete Einzelfallbelege. Keine massenhafte Umstellung offener Fälle auf Nicht ausreichend belegbar, um die Abschlusszahl zu erhöhen. Tatsächlich unzugängliche Fälle nachvollziehbar begrenzen; fehlende Bestätigung bedeutet nicht falsch.
6. Danach alle Teilbehauptungen mit der vollständigen zugänglichen Grundlage abgleichen, Wiederholungen zusammenführen und unsichere Rollen einzeln prüfen. Bestätigte Sprecherstatistik erst nach entsprechend dokumentierter Identifizierung.
7. Website-Aufbau, Navigation, Aussagefilter, Videoansicht, Berichtslinks und mobile Darstellung mit den neuen Daten kontrollieren. Ein nachgebildeter Player ist keine Prüfung des echten YouTube-Videos. Der zusätzliche Nutzerauftrag erlaubt ausdrücklich weitere geprüfte Teilveröffentlichungen. Dabei Teilbestand und alle Sachlücken sichtbar lassen; Issue #3 nicht als vollständig erledigt schließen.

## Quellenhinweise

S041/S062 betreffen Heartlands eigene Darstellung und die Originalrecherche von CORRECTIV/Frontal21. S059 dokumentiert historische institutionelle Tabakspenden, keine persönliche Bezahlung Seibts. S060/S061 betreffen § 188 und seine Erweiterung 2021. S063 und S066 sind erfolglose Abrufe; Ersatzquellen und Grenzen stehen jeweils im Datensatz. S069 ist Originalforschung über Q-Beiträge, kein Beweis einer tatsächlichen Insideridentität. Alle neuen Quellen tatsächlich öffnen und die gelesenen Abschnitte dokumentieren.

## Vorgeschriebene Sicherung

Im eigenen Worktree ausführen, Fehler vor einem Commit beheben:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Build-Factcheck.ps1 -VideoId mdo14671BPE
git add -- faktenchecks/mdo14671BPE docs/NAOMI_ARBEITSSTAND.md
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Build-Factcheck.ps1 -VideoId mdo14671BPE -Check
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Factcheck.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Test-Publication.ps1
node --test site/sync-test.js
git diff --cached --check
```

Bei Websiteänderungen zusätzlich den Aufbau aus `.github/workflows/pages.yml` sowie `node site/browser-test.js` mit extern bereitgestelltem Playwright/Chromium ausführen. Abhängigkeiten und Build-Ausgaben außerhalb des Repositorys halten. Inhaltliche Rechteprüfung bleibt zusätzlich zum technischen Filter erforderlich. Danach sinnvoll abgegrenzten Commit erstellen, normal pushen, Remote-SHA prüfen und Issue/PR mit nächstem konkretem Schritt aktualisieren.

## Prüfnachweise und zuletzt bearbeitete Punkte

Die erste Teilveröffentlichung bestand 83 Faktenchecktests, Generator-/Publikations-/Indexprüfung, 15 Synchronisationstests, 16 Browserprüfungen und sechs Naomi-spezifische Prüfungen. Browserprüfungen mit Playwright und vorhandenem Chrome, IFrame API nachgebildet. Öffentlicher Datenindex und Naomi-JSON wurden nach Deploy per HTTP kontrolliert. Der zusätzliche Versuch mit echtem YouTube-Stream ergab hier keine verwertbare Kontrolle.

Neu: A0072 ist mit dem zeitgenössischen Bericht von The Verge (S075, direkte YouTube-Auskunft) belegt. A0103 ist durch den früheren Express-Sendungsbericht (S076) teilweise belegt; WND (S074) ist eine abhängige Übernahme, kein zweiter unabhängiger Beleg. Die Korrektur der Fragestellung ist keine Bestätigung sämtlicher Klimapositionen. S073 (Yahoo/Bloomberg, HTTP 429) und S077 (anderer Express-Link, gesperrter Zugriff) sind erfolglose Abrufe. S072 bestätigt Heartlands institutionelle Kooperation 2020, nicht alle Detail- oder Zahlungsbehauptungen.

Im Folgeabschnitt sind die Auftritte A0102 belegt und der Rechtsfallkern A0168 teilweise belegt, ohne private Motive als bestätigt auszugeben. Das Berufungsurteil S080 liefert für A0211 Gegenkontext zur behaupteten Gefährdungsabsicht, klärt aber nicht alle Haftzeiten; weiterhin laufend. A0212 ist nach Nahkontext eine Meinung, die Teilbehauptung zu Auslandsverbindungen wurde als A0249 separat offen erhalten. Keine Löschung einer ungeklärten Tatsachenbehauptung zugunsten besserer Zahlen.

## Integrationsprüfung am 20.11.2026

[Codex] Neueren gemeinsamen Faktenindex aus PR #89 konfliktfrei übernommen; keine Indexregel oder Bedeutungsfaktoren geändert. 149 JavaScript-Tests und Faktenindex-Feldprüfung erfolgreich. Vor dieser Integration bestanden 117 PowerShell-Testfälle; der integrierte Stand wird zusätzlich durch die vollständige GitHub-CI geprüft. Browserprüfungen: 21 Hauptansicht, 17 Original-/Reaktionsansicht, 12 Rhetorik und 18 Wissensansicht erfolgreich. Die lokalen Testaufbauten kopieren jetzt die inzwischen eingeführten Seitensymbole; der Test des synthetischen Korrekturvorgangs wählt gezielt diesen Vorgang statt pauschal den ersten echten Eintrag. Die Sachbewertungen bleiben dadurch unverändert.
