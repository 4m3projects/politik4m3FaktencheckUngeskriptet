# Inhaltliche Nacharbeit zu grauen Ampeln

[Codex] 24. November 2026 · Nutzerauftrag zur möglichst weitgehenden quellenbasierten Nacharbeit. Basis: `a9a9a03`, eigener Branch `codex/grau-nachpruefung-20261124`. Der bestehende Arbeitsbaum und andere Worktrees wurden nicht verändert. Offene PRs und die Arbeitsaufträge #112, #111 und #13 wurden vor Beginn berücksichtigt.

## Originalzugang und Methode

Die bisherigen direkten Schnittstellenabrufe hatten wiederholt keinen Untertiteltext geliefert. In diesem Durchgang wurden die Originale im YouTube-Player aufgesucht, bei Abdel-Samad die Beschreibung aufgeklappt und das Transkript angefordert. Nach der Werbung ließen sich die deutschen automatischen Originaltextfassungen aller drei grauen Videos direkt privat exportieren. Sie liegen außerhalb des Repositorys. Es wurden keine fremden Untertitel, Medien oder Volltexte veröffentlicht. Nach dem Hinweis des Nutzers blieb der Player stumm.

Vor den Sachrecherchen wurde gezielt in UG und der lokal vorhandenen Wissensdatenbank HP gesucht. Frühere KI-Bewertungen und Kais vorbereitende Quellenlisten dienten nur als Suchhilfen. Die neuen Sachquellen wurden selbst geöffnet; gescheiterte Abrufe wurden nicht als gelesene Quelle ausgegeben. Als Ersatz für den gesperrten Destatis-Download wurden die amtliche Originalveröffentlichung in der Statistischen Bibliothek und die nachvollziehbar auf Destatis beruhende IfM-Reihe gelesen.

Die Prüfung ist textbasiert. Zeiten bleiben ungefähr und Sprecherzuordnungen plausibel. Es gab keinen vollständigen Hör-/Bildabgleich. Fragen, Gastaussagen, Textreferenzen und Wertungen wurden getrennt; die sachlich geklärte Nietzsche-Rückfrage bleibt ausdrücklich außerhalb des Index. Ein Textbezug beweist keine religiöse Geltung oder eine daraus abgeleitete allgemeine Täterpsychologie.

## Umgesetzte Einzelarbeit

| Video | Änderung | Grenzen |
| --- | --- | --- |
| Abdel-Samad `QxMuH1bjMwo` | A0052–A0075: 23 zusätzliche Sachprüfungen und eine politische Systemthese. Belegte Befunde, eingeschränkte Aussagen, ein widerlegter Sachkern und ein fehlender Kontext sind getrennt dokumentiert. 75 Prüfgegenstände insgesamt. | Erweiterte Text-Teilprüfung abgeschlossen, keine Vollprüfung. Die drei früher als nicht ausreichend belegbar bewerteten Sachkerne bleiben unverändert. Weitere Nebenbehauptungen und audiovisuelle Verifikation stehen aus. |
| Krall `OQnvClWgN-g` | A0031–A0040: zehn zusätzliche Sachprüfungen; 40 Prüfgegenstände insgesamt. Gleicher EZB-Zielwert an zwei Fundstellen wird nur einmal gezählt. | Weitere Kapitel müssen eigenständig erfasst werden. Das Schreiben eines Buchs wurde nicht mit seinem Erscheinungstermin verwechselt; kein neues Fehlurteil dazu eingeführt. |
| Schmidt-Salomon `Xw2tAp6UouE` | A0001–A0005: bisher ungeklärte Haltung des Videos nach direkter Originaltextkontrolle als eigene, nicht ausdrücklich zurückgewiesene Gastaussagen eingeordnet. | Alle Sachurteile und Gewichte unverändert; keine allgemeine Zustimmung des Hosts unterstellt. Nur fünf Gesprächsfenster mit Anschluss gelesen, kein Abschluss des Videos. |

Bestehende Sachurteile wurden nicht umgeschrieben. Neue Bedeutungsfaktoren beruhen auf der Rolle der Aussage, sind vorläufig und benötigen die übliche unabhängige Kontrolle. Neue Rhetorikhinweise wurden nicht ohne zusätzliche Prüfung erfunden.

## Berechnetes Ergebnis und Restarbeit

Vorher waren acht von elf Ampeln farbig; mit diesen Daten sind es neun. Abdel-Samad erreicht mit 71 gezählten Tatsachen die unveränderte Mindestdichte und wird nach Abschluss dieser erweiterten Text-Teilprüfung regulär berechnet. Ein Arbeitsstatus für den geprüften Teilbestand ist kein Vollständigkeitsnachweis. Die bestehenden Schwellen, die Berechnung und frühere Gewichte wurden nicht verändert; es wird kein Farbwert gespeichert.

Krall bleibt bei 34 gezählten Tatsachen und einer Mindestdichte von 68 grau. Schmidt-Salomon hat nach der Zurechnungsklärung fünf gezählte Tatsachen bei einer Mindestdichte von 60 und bleibt in Bearbeitung. Diese rechnerischen Differenzen sind Untergrenzen, kein Auftrag, beliebige Nebenbemerkungen oder Wiederholungen zum Auffüllen zu zählen. Nächster fachlicher Schritt ist die Erfassung eigenständiger Sachkerne aus den bisher dünn oder gar nicht erfassten Abschnitten, anschließend die Prüfung ihrer Quellen.

Die neuen Krall-Sachkerne haben keine bestehenden direkten Reaktionsverknüpfungen. Die bisher verbundenen Originalaussagen und Bewertungen bleiben identisch; daraus ergibt sich kein belegter Änderungsgrund für die beiden Krall-Reaktionen. Der historische Arbeitsstand ist weiterhin keine Quelle für neue Urteile. Kein neuer gesicherter Gegenbehauptungslink wurde aus bloßer Themenähnlichkeit konstruiert.

Die vorhandene offene Korrektur UG-C0004 betrifft einen anderen Lüning-Sachverhalt und wurde nicht pauschal erledigt. Prüfung und Veröffentlichung dieser Nacharbeit erfolgen über einen eigenen Draft-PR; kein Merge ist Teil dieses Arbeitsstands.

## Technische Prüfung

- 180 Node-Regressionstests bestanden; nach der abschließenden Trennung der Nietzsche-Rückfrage zusätzlich die 83 betroffenen Tests erneut bestanden.
- `scripts/Test-Factcheck.ps1`: 117 Testfälle bestanden.
- `scripts/Test-Publication.ps1`: 332 Dateien und der Git-Index ohne Fund durch den technischen Dateifilter geprüft. Dies ersetzt keine redaktionelle oder rechtliche Inhaltsprüfung.
- Generierte Artefakte aller elf Videos mit `Build-Factcheck.ps1 -Check` abgeglichen; Abdel-Samad nach der letzten Rollenkorrektur erneut erzeugt und geprüft.
- `node scripts/faktenindex.js pruefen`, `node scripts/wissen.js pruefen`, `node scripts/wissen.js aenderung --basis origin/main` und `git diff --check` bestanden. Der vorhandene Prüfauftrag UG-C0004 bleibt sichtbar.
- Die bisherigen 51 Abdel-Samad- und 30 Krall-Aussageobjekte sind gegenüber der Basis unverändert; bei Schmidt-Salomon bleiben alle fünf Sachurteile und Bedeutungsfaktoren erhalten.

Es wurden keine Änderungen an Webseitenlogik, Schwellen oder Tests vorgenommen. Browser-Oberflächentests wurden nicht ausgeführt.
