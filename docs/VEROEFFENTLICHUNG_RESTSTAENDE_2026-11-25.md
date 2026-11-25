# Veröffentlichung noch ausstehender Arbeitsstände

[Codex], 25.11.2026. Jens hat ausdrücklich die Veröffentlichung aller noch nicht veröffentlichten Arbeiten einschließlich Übernahme nach `main` beauftragt.

## Abgleich und Herkunft

Ausgangsstand ist `bf42b21a25079656f180a98c7708aae18ea61a37` mit dem bereits veröffentlichten Kurz-Faktencheck aus PR #128. Auf GitHub waren keine offenen oder ungemergten Pull Requests vorhanden. Alle lokalen und Remote-Branches wurden gegen die aktuelle Hauptlinie und die Köpfe ihrer übernommenen Pull Requests abgeglichen. Durch Squash-Merges abweichende Commit-IDs allein sind keine unveröffentlichten Inhalte.

Zwei tatsächliche Reststände wurden gefunden:

- Die noch ungesicherte Erweiterung im Arbeitsbaum `codex/krall-schmidt-pruefung-20261124`, dessen Lauf am 24.11. wegen ausgeschöpfter Credits endete. Die dokumentierten Quellenprüfungen und direkten privaten Player-Textfassungen stammen aus diesem Lauf. Seine ursprünglichen Dateien bleiben erhalten. Übernommen werden 37 zusätzliche Krall-Prüfgegenstände und 68 zusätzliche Schmidt-Salomon-Prüfgegenstände.
- Commit `32ed15ea2af59c36fb3a4b94eda5b06e1d67b7dd` mit dem Bild-/Kanalabgleich zur Alfred-Reaktion. Er ergänzt zwei abgeschlossene Sachprüfungen (A0029/A0030) und den noch offenen Grafikabgleich A0026 samt Rückabgleich zum Original. Die auf `main` inzwischen hinzugekommenen Faktoren-Gegenprüfungen, auch der Dissens zu A0030, bleiben vollständig erhalten. Einzelheiten: [damaliges Prüfprotokoll](NACHPRUEFUNG_ALFRED_BILD_2026-11-20.md).

Die aktuellen Kurz-Daten, bestehende Themen, Korrekturvorgänge und Bewertungen anderer Videos werden bewahrt. Der lokale Kant-Entwurf hatte die inzwischen für den Kurz/Lüning-Werbeabgleich verwendete ID UG-K0011 belegt. Er wird deshalb unter der freien ID UG-K0013 veröffentlicht; UG-K0011 bleibt unverändert. UG-K0012 ergänzt Artikel 123 AEUV. Die zugehörigen Themen werden additiv zusammengeführt.

## Inhalt und Grenzen

Krall wächst von 40 auf 77 Prüfgegenstände: 28 neue abgeschlossene Sachprüfungen und neun offene Sachfragen. Schmidt-Salomon wächst von fünf auf 73: 58 neue abgeschlossene Sachprüfungen, neun offene Sachfragen und eine politische Präferenz. Das sind zusammen 105 neue Prüfgegenstände, darunter 86 abgeschlossene Tatsachenprüfungen. Die 45 zuvor veröffentlichten Aussagen beider Videos sind objekthaft mit dem Ausgangsstand verglichen und bleiben unverändert.

Die übernommenen Recherchen werden nicht als vollständig neu durchgeführt ausgegeben. Vor Veröffentlichung wurden sämtliche neuen Paraphrasen, Begründungen, Quellenzuordnungen und offenen Folgeaufträge redaktionell gelesen; ausgewählte Originaltextfenster und Sachquellen wurden gezielt erneut kontrolliert. China-Paraphrase und Kündigungsaussage wurden enger gefasst. Insbesondere beweist die gesetzliche Möglichkeit einer Kündigung keine statistische Kündigungspraxis: Der unveröffentlichte DAX-Eintrag wird mit erhaltener Arbeitsbegründung als kontextbedürftig eingeordnet. Das ist keine Änderung einer bereits veröffentlichten Bewertung.

Erneut tatsächlich gelesen wurden unter anderem der Gesprächskontext der DAX-/China-Passagen, die Religions-/Abbruchpassagen und die vorsichtige Entwicklungsangabe um 02:15, § 1 KSchG in der amtlichen Gesamtausgabe, § 218a Absätze 1–3, die eigene kirchliche Lehrdarstellung von 1974 (Abschnitte 6–7 und Fußnote 19), die RCOG-Zusammenfassung des Reviews 2022, die chinesische Verfassung Artikel 6–18, Kants Aufklärungsaufsatz und Artikel 123 AEUV. Der erneute Abruf der KSchG-Einzelnorm scheiterte zunächst technisch; die amtliche Gesamtausgabe war anschließend lesbar. Vor der Ergänzung wurden UG und das lokale HP-Archiv gezielt durchsucht. Keine fremden Quellenkopien werden eingecheckt.

Beide Interviews bleiben ausdrücklich Teilbestände. Automatische Originaltexte, ungefähre Satzfenster und plausible Sprecherrollen sind keine durchgängige Hör-/Bildkontrolle. Die übrigen neuen Prüfungen behalten ihre dokumentierte Quellenlektüre vom 24.11.; eine zweite vollständige Recherche aller Punkte wird nicht behauptet. Neue Bedeutungsfaktoren und eigene Anteile bleiben vorläufig, bis sie unabhängig gegengeprüft wurden. Keine Berechnungsregel oder Schwelle wird geändert. Offene Fragen werden weder als Fehler noch als abschließende Unüberprüfbarkeit ausgegeben.

## Prüfprotokoll

Ausgeführt und bestanden: 181 JavaScript-Regressionstests (169 Workflow-Tests, neun Krall- und drei Sprunglink-Tests), 117 PowerShell-Testfälle, Generator-Prüfmodus für alle zwölf Videos, Faktenindex- und Wissensdatenvalidierung sowie `git diff --check`. Die Tests änderten keine Bewertungen. Browser-Regressionstests wurden für diese reinen Daten-/Dokumentationsänderungen nicht zusätzlich ausgeführt.

Die lokale Berechnung ergibt Krall 0,258 / Rot und Schmidt-Salomon 0,599 / Gelb, jeweils bei rund 87 Prozent Prüfabdeckung des erfassten Teilbestands. Damit haben alle zwölf Videos eine berechenbare Farbe, ohne vollständige Videoerfassung zu behaupten. Diese Werte sind dokumentierte Rechenergebnisse und werden nicht als Ampelfelder gespeichert.

Die Veröffentlichung erfolgt über einen eigenen Pull Request; die GitHub-Gesamtprüfung und das anschließende Pages-Deployment werden vor der Abschlussmeldung kontrolliert.
