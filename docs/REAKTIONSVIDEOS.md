# Originalinterviews, Reaktionsvideos und Prüfkonflikte

Erstellt von: Claude, Auftrag aus Issue #4. Grundlage: [REAKTIONSVIDEOS_KONZEPT.md](REAKTIONSVIDEOS_KONZEPT.md).

Die Hauptübersicht der Webseite zeigt nur **Originalinterviews** des Kanals „ungeskriptet“. Videos anderer Kanäle, die sich nachweislich auf ein Original beziehen (Reaktionen, Kommentare, Analysen, eigene Faktenchecks, journalistische Einordnungen), erscheinen auf der Seite des jeweiligen Originals im Reiter „Reaktionen (n)“ (`#/video/<ID>/reaktionen`). Eine Reaktion kann sich auf mehrere Originale beziehen. Es gibt keine feste Kanalliste und keine Sonderbehandlung bestimmter Personen.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `faktenchecks/<ID>/video.json` | Rolle und Metadaten eines Videos |
| `faktenchecks/beziehungen.json` | Alle Zuordnungen Reaktion ↔ Original, mit verknüpften Aussagen |
| `faktenchecks/<ID>/strukturiert/aussagen.json` | Unverändert (Schema 2). Auch Reaktionen werden damit geprüft. |
| `site/relations.js` | Validierung, Konfliktlogik und Index, gemeinsam für Webseite und Tests |

Die Publikationsprüfung lässt nur genau diese beiden neuen Pfade zu. Faktencheck-Dateien werden für Beziehungen nicht dupliziert.

### `video.json`

```json
{
  "schemaVersion": 1,
  "videoId": "elfstellige ID, gleich dem Verzeichnisnamen",
  "role": "original | reaction",
  "reactionType": "null bei Originalen; sonst zustimmend | kritisch | gemischt | kommentar | analyse | faktencheck | einordnung",
  "channel": "Kanalname",
  "title": "Videotitel",
  "videoUrl": "https://…",
  "workStatus": "Erfasst | In Bearbeitung | Teilbestand geprüft | Abgeschlossen",
  "identification": { "basis": "Woran die Einordnung festgemacht ist", "certainty": "Belegt | Plausibel", "checkedOn": "JJJJ-MM-TT" }
}
```

- Als `original` nur mit `certainty: "Belegt"` einordnen. Die beiden vorhandenen Analysen sind anhand von Kanal, Titel und Video-ID in ihrer README als Originale eingeordnet.
- Ein Video ohne `video.json` bleibt sichtbar, aber unter „Noch nicht eingeordnet“ und kann in keiner Beziehung vorkommen.

### `beziehungen.json`

```json
{
  "schemaVersion": 1,
  "relations": [
    {
      "id": "R0001",
      "reactionVideoId": "…", "originalVideoId": "…",
      "certainty": "Belegt | Plausibel",
      "basis": "Warum diese Reaktion sich auf dieses Original bezieht",
      "history": [{ "date": "JJJJ-MM-TT", "change": "Korrektur der Zuordnung …" }],
      "claimLinks": [
        {
          "id": "L0001",
          "type": "gleiche_behauptung | gegenbehauptung | gibt_wieder | ergaenzt",
          "originalClaimId": "<Original>-A0001",
          "reactionClaimId": "<Reaktion>-A0003 oder null",
          "reactionSeconds": 95,
          "note": "Was genau verknüpft wird",
          "review": { "task": "https://github.com/…/issues/…", "note": "Was zu klären ist" },
          "resolution": { "status": "unterschiedlicher_bezug | neubewertung_original | neubewertung_reaktion | begruendet_abweichend", "note": "…", "date": "JJJJ-MM-TT", "sources": ["https://…"] },
          "history": [{ "date": "JJJJ-MM-TT", "change": "…" }]
        }
      ]
    }
  ]
}
```

IDs sind stabil und werden nie neu vergeben. Ein Paar Reaktion/Original gibt es nur einmal; mehrere Bezüge stehen als `claimLinks` darin. `reactionSeconds` ist die Stelle in der Reaktion, an der sie auf das Original eingeht.

Eine `gegenbehauptung`, deren Reaktionsaussage belegt und deren Originalaussage kritisch bewertet ist (oder umgekehrt), erscheint auf der Webseite als Gegendarstellung bei der kritischen Aussage, siehe [GEGENDARSTELLUNG.md](GEGENDARSTELLUNG.md).

## Konsistenzprüfung

Bei der Analyse einer Reaktion wird der bestehende Originalcheck **als Kontext** herangezogen: Aussage-ID, Bewertung, Quellen, Prüfdatum und offene Fragen. Er ist **kein Wahrheitsmaßstab**. Neue Primärquellen oder bessere Argumente können seine Bewertung widerlegen.

Automatisch verglichen werden nur zwei Arten von Verknüpfungen:

| Art | Erwartung |
| --- | --- |
| `gleiche_behauptung` | Beide Seiten prüfen dieselbe überprüfbare Behauptung. Die Richtung der Endbewertungen muss übereinstimmen. |
| `gegenbehauptung` | Die Reaktion behauptet das Gegenteil. Die Richtungen müssen gegensätzlich sein. |

Richtung: *Belegt* und *Teilweise belegt* stützen, *Irreführend / Kontext fehlt* und *Widerlegt* sprechen dagegen. *Meinung / Prognose*, *Nicht ausreichend belegbar* und offene Prüfungen haben keine Richtung und lösen nie einen Konflikt aus („Vergleich offen“). Eine Meinung ist nicht falsch, nur weil sie abweicht. `gibt_wieder` (korrekte Wiedergabe des Originals) und `ergaenzt` werden redaktionell beurteilt, nicht automatisch.

Ergebnis je Verknüpfung: *Bewertungen passen zusammen*, *Vergleich offen*, *Prüfkonflikt offen* oder *Abweichung begründet geklärt*.

## Review- und Korrekturablauf

1. Reaktion erfassen (`video.json` mit `role: reaction`) und ihre eigenen Aussagen in `aussagen.json` prüfen: korrekte Wiedergabe des Originals, eigene Tatsachenbehauptungen, Kontext, Quellen, Schlussfolgerungen. Zustimmende und kritische Reaktionen werden gleich behandelt.
2. Zuordnung in `beziehungen.json` mit Begründung eintragen. Ohne eindeutig belegbaren Bezug keine Zuordnung, bei Unsicherheit `certainty: "Plausibel"`.
3. Ergibt der Vergleich einen **Prüfkonflikt**, schlägt der Build fehl, bis eine Review-Aufgabe (`review.task`, z. B. ein GitHub-Issue mit Gegenüberstellung der Quellen) eingetragen ist. Danach wird der Konflikt auf beiden Detailseiten sichtbar markiert; gegensätzliche Endbewertungen erscheinen nie stillschweigend.
4. Klärung in beide Richtungen: Wird eine der beiden Bewertungen nach neuer Recherche geändert, geschieht das in deren `aussagen.json` mit dokumentierter Bewertungsänderung (`migration.assessmentChange`), nie nur zur erzwungenen Übereinstimmung. Bleiben beide Bewertungen berechtigt (z. B. anderer Bezugszeitpunkt oder Geltungsbereich), wird `resolution` mit Begründung und Quellen eingetragen.
5. Jede Änderung an einer Zuordnung oder Klärung wird in `history` festgehalten.

## Tests

- `node --test site/relations-test.js` (im Workflow): Schema, Rollen, Zuordnung, fehlende Referenzen, Duplikate, Konfliktlogik, Pflicht zur Review-Aufgabe und Prüfung der echten Projektdaten.
- `node site/relations-browser-test.js` (lokal mit Playwright): Startseite nur mit Originalen, Reaktionsabschnitt, Rückverlinkung, Gegenüberstellung, Konfliktmarkierung, Querverweise, Mobilansicht und bestehende Seiten.
- Die Testfälle nutzen **fiktive Daten** aus `site/relations-fixtures.js`: zwei Reaktionen verschiedener Kanäle zu einem Original und eine Reaktion zu zwei Originalen. Sie werden nie veröffentlicht. Ein echter Prüfkonflikt existiert derzeit nicht, weil noch keine Reaktion geprüft ist.
