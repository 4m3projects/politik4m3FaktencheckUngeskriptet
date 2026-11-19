---
name: Korrekturvorgang
about: Eine frühere Bewertung ist möglicherweise falsch, eine Quelle falsch gelesen oder die Faktenlage hat sich geändert.
title: "Korrektur: "
labels: []
---

<!--
Ablauf und Regeln: docs/AGENTEN_WISSEN.md Abschnitt 4. Agenten legen zusätzlich den Korrekturvorgang an:
  node scripts/wissen.js korrektur --aussage <ID> --art "<Art>" --beschreibung "<Text>" --agent <Name> --anlegen
Bitte keine Bewertungen ändern, bevor der Vorgang entschieden ist.
-->

## Was ist möglicherweise falsch?

Betroffene Aussage oder Wissenseintrag (Link oder ID, z. B. `mlxFA9T88I0-A0012` oder `UG-K0001`):

Art (eine auswählen):
- [ ] Fehlbewertung
- [ ] Quelle falsch interpretiert
- [ ] Faktenlage geändert (die Aussage stimmte damals, heute nicht mehr)
- [ ] Zuordnung falsch (Thema oder Verknüpfung)

## Begründung und Quellen

Bitte Originalquellen angeben (Link, Abrufdatum, was genau dort steht). Ein Widerspruch zwischen zwei KI-Ergebnissen genügt nicht.

## Nur für die Bearbeitung

- [ ] Korrekturvorgang `wissen/korrekturen/<Kürzel>-C….json` angelegt (Status Gemeldet)
- [ ] Betroffene mit `node scripts/wissen.js betroffen` ermittelt und geprüft
- [ ] Originalquellen neu gelesen, Beweislage in `evidence`
- [ ] Entscheidung (Bestätigt/Verworfen); Freigabe durch Jens bei mehr als 3 Aussagen, Urteil eines Wissenseintrags oder unklarer Beweislage
- [ ] Umgesetzt: Änderungen mit vorher/nachher in `changes`, Vermerk mit Korrektur-ID in `migration.assessmentChange`, `[regenerate]`
