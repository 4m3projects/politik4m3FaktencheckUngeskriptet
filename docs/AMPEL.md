# Faktenampel – Gesamteinschätzung je Video

Erstellt von: Claude, auf Auftrag von Jens (18.11.2026).

Die Faktenampel zeigt auf einen Blick, wie die bisher entschiedenen Tatsachenbehauptungen eines Videos ausgefallen sind. Sie erscheint auf den Karten der Startseite, im Kopf jeder Videoseite, in den Listen von Originalen und Reaktionen und auf den Themenseiten neben jedem Video, aus dem eine Aussage stammt (dort getrennt von der Bewertung der einzelnen Aussage).

## Grundsatz: berechnet, nie gesetzt

- Die Ampel wird **nirgends gespeichert** und von keinem Prüfer vergeben. Es gibt kein Feld dafür in `video.json`, `aussagen.json` oder `statistik.json`.
- Sie wird beim Anzeigen zentral aus den vorhandenen Einzelbewertungen (`strukturiert/statistik.json`, erzeugt aus `aussagen.json`), dem Arbeitsstand aus `video.json` und der Laufzeit (`scope.durationSeconds`) berechnet.
- Die gesamte Regel steht an **einer Stelle**: `site/ampel.js` (`RULES` und `rate`). Wird dort eine Schwelle geändert, stuft die Seite beim nächsten Deploy alle Videos automatisch neu ein, ohne Neuprüfung.
- Tests: `node --test site/ampel-test.js` (läuft im Workflow „Webseite“).

## Regel

1. **Grundlage** („entschieden“): abgeschlossen bewertete Tatsachenbehauptungen mit Belegt, Teilweise belegt, Irreführend / Kontext fehlt oder Widerlegt. Meinungen, Prognosen, noch nicht geprüfte (Offen), laufende, nicht überprüfbare und „nicht ausreichend belegbare“ Aussagen zählen nicht mit. Ungeprüft ist nicht falsch. Als „erfasste Tatsachenbehauptungen“ (für die Mindestanteile) zählen abgeschlossene, noch nicht geprüfte, laufende und nicht überprüfbare; siehe [AGENTEN_PRUEFSTATUS.md](AGENTEN_PRUEFSTATUS.md).
2. **Fehleranteil** = (Widerlegt + Irreführend / Kontext fehlt) ÷ entschiedene Tatsachenbehauptungen. Teilweise belegt ist kein Fehler.
3. **Stufen**: Grün unter 10 %, Gelb 10 bis unter 25 %, Rot ab 25 %.
4. **Nicht bewertbar**, wenn
   - weniger als 10 Tatsachenbehauptungen entschieden sind, oder
   - weniger als 20 % aller erfassten Tatsachenbehauptungen entschieden sind, oder
   - insgesamt weniger als 20 Tatsachenbehauptungen je Stunde Laufzeit erfasst sind (gezielte Kleinauswahl statt Querschnitt; eine solche Auswahl würde die Quote verzerren).
5. **YouTube Shorts** (`video.json` mit `"format": "short"`, siehe [SHORTS.md](SHORTS.md)): Ein Short wird vollständig erfasst, es gibt also keine Auswahl, deren Quote verzerrt sein könnte. Er enthält aber meist nur wenige Aussagen, sodass die Mindestzahl von 10 nie erreicht würde. Deshalb gilt dort: mindestens **3** entschiedene Tatsachenbehauptungen und mindestens **50 %** der erfassten entschieden (`RULES.short`). Stufen und Fehleranteil bleiben gleich. Bei so kleiner Basis kann eine einzige Aussage die Farbe ändern; die Basis steht immer neben der Ampel. Kurze normale Videos ohne dieses Kennzeichen behalten die allgemeine Regel.
6. **Vorläufig / Noch in Prüfung** (keine Ampel), wenn `video.json` den Arbeitsstand „In Bearbeitung“ trägt oder die Grundlage zu klein ist und noch Prüfungen ausstehen (Aussagen noch nicht geprüft oder in Bearbeitung).

Bei laufenden Prüfungen zeigt die Ampel den bisherigen Stand der Sachentscheidungen und bei zu kleiner Auswahl die für die Videolaufzeit erforderliche Mindestzahl an erfassten Tatsachenbehauptungen. Auch bei ausreichend vielen Sachurteilen bleibt eine zu kleine Auswahl vorläufig, solange Einzelprüfungen ausstehen.

## Was die Ampel nicht ist

- Kein Urteil über das ganze Video: Sie beschreibt nur den geprüften Bestand und nennt immer ihre Grundlage („Basis: x entschiedene von y erfassten Tatsachenbehauptungen“).
- Keine Glaubwürdigkeitsnote für Personen, kein Ranking.
- **Darstellungshinweise (Rhetorik, `rhetorik.json`) gehen nie ein.** `rate()` erhält sie gar nicht.
