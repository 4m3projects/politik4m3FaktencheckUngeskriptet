# Dauerhafte Agentenregel: Reaktionsvideos verbessern Original-Faktenchecks

Diese Datei ist eine **allgemeine Arbeitsanweisung für alle KI-Agenten** (Codex, Claude, ChatGPT und weitere) im Projekt. Sie gilt bei **jeder** Analyse eines Videos, das sich auf ein bereits erfasstes Interview bei „ungeskriptet“ bezieht. Sie ist kein Auftrag, bestimmte Videos jetzt zu bearbeiten.

## Grundprinzip

Eine Reaktionsanalyse ist zugleich eine Gelegenheit zur **Qualitätssicherung des Original-Faktenchecks**. Der bisherige Originalcheck ist ein dokumentierter Prüfstand, keine endgültige Wahrheit. Auch Reaktionsvideos sind Hinweise, keine automatisch verlässlichen Quellen. Alle Seiten werden nach denselben evidenzbasierten Kriterien geprüft.

## Verbindlicher Arbeitsablauf bei jeder neuen Reaktion

1. **Zuordnen:** Das Reaktionsvideo und die tatsächlich angesprochenen Originalinterviews eindeutig identifizieren. Eine Reaktion kann mehrere Originale betreffen. Unbelegte Zuordnungen nicht als sicher ausgeben.
2. **Eigenständig prüfen:** Wiedergaben des Originals, eigene Tatsachenbehauptungen, Quellen, Auslassungen und Schlussfolgerungen der Reaktion mit Zeitmarken erfassen. Meinungen, Prognosen und Tatsachenbehauptungen trennen. Zustimmende und kritische Reaktionen gleich behandeln.
3. **Rückabgleich:** Zu jeder relevanten Reaktionsaussage die konkrete Originalstelle und vorhandene Aussage-ID suchen. Inhalt, Geltungsbereich, Bezugszeitpunkt, Sprecher, Quellen, Bewertung und Unsicherheiten vergleichen. Nicht allein anhand ähnlicher Stichworte verknüpfen.
4. **Lücken entdecken:** Wenn eine Reaktion auf eine bislang **nicht erfasste prüfbare Behauptung des Originals** aufmerksam macht, einen neuen Original-Prüfkandidaten mit Zeitmarke und Kontext erfassen. Nicht ohne Prüfung als falsch oder richtig bewerten.
5. **Neue Evidenz prüfen:** Zusätzliche Quellen, Gegenbelege, Zahlen oder Kontext unabhängig gegen möglichst verlässliche Primärquellen überprüfen. Die Reaktion kann richtigliegen, teilweise richtigliegen oder sich irren.
6. **Originalcheck verbessern:** Dokumentieren, ob neue Evidenz den Originalcheck bestätigt, ergänzt, einschränkt oder widerlegt. Bei tragfähiger Evidenz eine Ergänzung bzw. begründete Neubewertung **am Original-Faktencheck** vornehmen, nicht nur im Reaktionsbericht. Frühere Bewertung, neue Bewertung, Begründung, Quellen, Prüfdatum und Bearbeiter nachvollziehbar festhalten. Stabile Aussage-IDs erhalten.
7. **Offene Konflikte:** Bei unzureichender Evidenz einen sichtbaren offenen Review bzw. ein Issue anlegen. Widersprüchliche Urteile nicht stillschweigend vereinheitlichen. Ungeprüft bedeutet nicht falsch.
8. **Folgeabgleich:** Wird eine Originalaussage ergänzt oder neu bewertet, **alle** damit verknüpften Reaktionschecks erneut auf Aktualität und Konsistenz prüfen; nötige Korrekturen oder Review-Aufgaben dokumentieren.
9. **Veröffentlichen:** Prüfumfang, Teilstände, Unsicherheit, Quellen und Korrekturverlauf transparent machen. Keine künstlichen Fehlerquoten oder pauschalen Personenurteile. Veröffentlichungen nur mit eigenen Paraphrasen und Quellenlinks; keine fremden Volltranskripte oder Medien einchecken.

## Automatisierung und Verantwortung

- **Auslöser:** Jede neu erfasste bzw. aktualisierte Reaktionsprüfung soll den Rückabgleich anstoßen. Änderungen am Original sollen den Folgeabgleich der zugehörigen Reaktionen anstoßen.
- Automatisierbar sind Zuordnungsvorschläge, Erkennung bislang fehlender Originalaussagen, Konflikt-/Neuheitslisten und Review-Aufgaben. **Automatische Vorschläge sind keine verifizierten Fakten.**
- Sachliche Neubewertungen benötigen nachvollziehbare Belegprüfung; bei offenen oder nicht zugänglichen Quellen nicht auf Verdacht umwerten. KI-Reviews sollen ihre tatsächlichen Prüfhandlungen und Grenzen benennen.
- Der Rückabgleich darf **nicht** als vollständig erledigt markiert werden, wenn Video, Originalstellen oder nötige Quellen nicht zugänglich waren.
- Vor Änderungen bestehende Arbeitsstände, laufende Branches und Reviews anderer Agenten prüfen. Keine konkurrierenden Änderungen überschreiben; Ergebnisse über Issues/PRs abstimmen.

## Technische Orientierung

Das derzeitige Datenmodell und die Verknüpfungen sind in [REAKTIONSVIDEOS.md](REAKTIONSVIDEOS.md) beschrieben. Aussagen und Beziehungen mit stabilen IDs ablegen; Review-Status und Änderungsverlauf dort führen, wo die jeweils aktuelle Implementierung sie unterstützt. Fehlt eine notwendige Funktion, **nicht so tun, als sei sie automatisiert**: nachvollziehbare Review-Aufgabe dokumentieren und technische Erweiterung separat planen.

## Mindestprüfungen für eine Implementierung

- Eine Reaktion nennt eine bisher übersehene überprüfbare Originalbehauptung → neuer, noch nicht bewerteter Original-Prüfkandidat.
- Eine Reaktion bringt eine neue belastbare Primärquelle → belegter Vorschlag zur Ergänzung oder Neubewertung des Originals mit Verlauf.
- Eine Originalbewertung ändert sich → betroffene Reaktionsprüfungen werden erneut abgeglichen oder als ausstehend markiert.
- Unklare Zuordnung, fehlender Videozugang und widersprüchliche Quellen → kein automatisch bestätigtes Urteil.
