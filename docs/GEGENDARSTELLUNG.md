# Gegendarstellung aus einem anderen geprüften Video

Erstellt von: Claude, auf Auftrag von Jens (19.11.2026).

## Zweck

Sagt jemand in einem Video etwas Falsches oder Unsicheres, und ein anderes geprüftes Video erklärt dieselbe Sache belegt anders, zeigt die Webseite das andere Video an dieser Stelle als Referenz: „Das stimmt so nicht, hier wird es belegt anders erklärt“, mit Link zur Aussage und Zeitmarke bei YouTube. Der Hinweis erscheint

- in der Auswertung (Aussagekarte auf `#/video/<ID>` und `#/video/<ID>/aussage/<Aussage>`), direkt unter der Begründung, und
- neben dem laufenden Video (`#/video/<ID>/video`) in kurzer Form unter der Aussage.

## Regel (nur in `site/gegendarstellung.js`)

1. **Nur bei kritischen Aussagen:** Widerlegt, Irreführend / Kontext fehlt, Nicht ausreichend belegbar, Meinung / Prognose (Vermutungen) sowie noch nicht geprüfte, laufende oder nicht überprüfbare Aussagen. **Belegt** und **Teilweise belegt** bekommen nie eine Gegendarstellung.
2. **Nur belegte Gegenaussagen:** Die Gegenaussage muss selbst abgeschlossen als *Belegt* oder *Teilweise belegt* bewertet sein und aus einem **anderen** Video stammen.
3. **Nur aus gepflegten Verknüpfungen**, nie aus Wortähnlichkeit:
   - `faktenchecks/beziehungen.json`: Verknüpfung vom Typ `gegenbehauptung` (in beide Richtungen: auch ein Original kann eine falsche Reaktionsaussage korrigieren).
   - Wissenseinträge `wissen/eintraege/*.json` mit Status `Geprüft` und entschiedenem Urteil: Die kritische Aussage ist mit `gleichwertig`/`teilaspekt` verknüpft und die Gegenaussage mit `widerspricht` (oder umgekehrt), und die Haltung der Gegenaussage folgt dem Urteil des Eintrags. `verwandt` zählt nie, ebenso Verweise in andere Repos (`repo`).
4. **Mehrere Gegenaussagen:** Belegt vor Teilweise belegt, dann das Video mit der besseren Faktenampel (Grün, Gelb, Nicht bewertbar, Vorläufig, Rot; berechnet nur in `site/faktenindex.js`), dann die direkte Reaktionsverknüpfung vor der Wissensdatenbank. Die beste steht vorn, die übrigen sind aufklappbar.
5. **Keine Rückwirkung:** Es wird nichts gespeichert. Bewertungen, Statistik und Faktenampel bleiben unverändert.

Tests: `node --test site/gegendarstellung-test.js` (im Workflow, mit Prüfung der echten Projektdaten) und Abschnitte „Gegendarstellung“ in `node site/wissen-browser-test.js`.

## Pflege durch Agenten

Die Zuordnung Aussage ↔ Gegenaussage wird **redaktionell (KI-gestützt) gepflegt**; die Webseite rechnet nur. Pflichtregel für alle Agenten:

- Prüft ein Agent ein Video und findet dort eine **belegte** Aussage, die einer kritisch eingeordneten Aussage in einem anderen Video an derselben Sache widerspricht, verknüpft er beide:
  - bei einem Reaktionsvideo zum Original als `claimLinks`-Eintrag `gegenbehauptung` mit `reactionSeconds` und Begründung in `note` (docs/REAKTIONSVIDEOS.md);
  - bei Videos ohne Reaktionsbezug über einen Wissenseintrag: kritische Aussage `gleichwertig` (bzw. `widerspricht`), Gegenaussage mit der jeweils anderen Haltung, jeweils mit `contextNote` (docs/AGENTEN_WISSEN.md).
- Verknüpft wird nur, wenn Gegenstand, Zeitbezug und Geltungsbereich übereinstimmen. Ein ähnliches Thema reicht nicht.
- Keine Bewertung wird geändert, um eine Gegendarstellung zu erzeugen oder zu verhindern. Fällt beim Verknüpfen auf, dass eine Bewertung falsch sein könnte, gilt der Korrekturablauf (docs/AGENTEN_WISSEN.md, Abschnitt 4).
- Nach dem Verknüpfen `node --test site/gegendarstellung-test.js` ausführen.
