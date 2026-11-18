# Strukturierte Faktenchecks: Schema 2 und Arbeitsablauf

Die gemeinsame Bibliothek in [Factcheck-Common.ps1](../scripts/Factcheck-Common.ps1) validiert Daten, berechnet Statistiken und erzeugt Markdown deterministisch. [Build-Factcheck.ps1](../scripts/Build-Factcheck.ps1) schreibt die Artefakte; mit -Check vergleicht es diese nur. [Test-Factcheck.ps1](../scripts/Test-Factcheck.ps1) prüft die Regressionen und über den Publikationsprüfer sämtliche vorhandenen strukturierten Videobestände.

## Dateien und Pflege

Pro Video liegt die einzige manuell gepflegte strukturierte Datenquelle unter `faktenchecks/<Video-ID>/strukturiert/aussagen.json`. Daraus entstehen README.md, statistik.json, migration.md und berichte/kapitel-<Nummer>.md für jedes tatsächlich erfasste Kapitel. Generierte Dateien nicht separat bearbeiten. Die Ausgabe enthält auch direkt neu erfasste Aussagen ohne Altpunkte. Bestehende ältere Berichte außerhalb des Unterordners werden nicht überschrieben.

Ein neues Video benötigt nur einen Datensatz mit eigener elfstelliger YouTube-ID, URL, Laufzeit, Datum und tatsächlicher Inhaltsgrundlage. Keine Änderungen an Programm oder Validator nötig. Für eine Neuerfassung sind legacyPoints und selectedLegacyIds leer, die beiden Altpunktezahlen null, baselineCommit und claim.legacyId null. Migrationstexte beschreiben dann die direkte Neuerfassung. Ein vollständiges Beispiel steht weiter unten.

## Datenbereiche

| Bereich | Bedeutung |
| --- | --- |
| schemaVersion | 2; unbekannte Felder und andere Versionen werden abgewiesen |
| scope | Video-ID/-URL, Laufzeit, Stichtag, Teilbestand/Vollbestand, coverageNote zur tatsächlichen Abdeckung, researchNote zur Recherchegrundlage sowie Migrationsumfang und ursprünglicher Commit oder null |
| legacyPoints | Eindeutige alte Prüfpunkt-IDs, Kapitel/Nummer, relativer alter Berichtspfad, SHA-256, vollständiger eigener alter Prüfpunkttext und Migrationsentscheidung |
| sources | Quellen-ID, Titel, direkte HTTPS-URL, Autor/Institution/Datenstand in details, Abrufdatum und tatsächliche Zugriffsgrundlage |
| speakers | Videointern stabile SP-IDs, Name oder null, Videorolle und tatsächliche Identifizierungsgrundlage |
| claims | Eigenständig bewertbare Aussage mit stabiler ID, Kapitel, Herkunft oder null, Art, eigener Beschreibung, Prüfstatus/Bewertung, Begründung, Belegen, offenen Fragen, Migrationsentscheidung, Vorkommen und Beziehungen |

IDs nicht neu nummerieren oder für andere Bedeutungen verwenden. Gleichbedeutende Wiederholungen gehören in die Vorkommensliste derselben Aussage. Inhaltlich unabhängig bewertbare Teilbehauptungen trennen und die Entscheidung begründen. Der Validator erkennt exakte Textdubletten; semantische Gleichheit bleibt redaktionell zu prüfen.

Teilbestand bedeutet ausdrücklich keine Gesamtvideostatistik. Vollbestand darf nur nach tatsächlicher vollständiger Erfassung verwendet werden und ist bei noch unmigrierten Altpunkten verboten. Der Validator kann eine inhaltlich unzutreffende Vollständigkeitsangabe nicht selbst erkennen. Die Anzahl strukturierter Datensätze ist nicht die Anzahl migrierter Altpunkte: aktuell 178 Datensätze aus 33 von 99 Punkten. Davon gehen 176 Inhalte mit eigenem Aussagebezug in uniqueStatements ein; zwei ausschließlich erörterte Inhalte (Rückfrage bzw. Zurückweisung) stehen getrennt in referenceOnlyStatements. Kapitel 1 trägt acht neue Datensätze und ein zusätzliches Vorkommen der vorhandenen A0007 bei, Kapitel 2 weitere 58 Datensätze, Kapitel 3 weitere 102 (A0077–A0178). Siehe die Recherche- und Migrationsberichte zu [Kapitel 2](https://github.com/4m3projects/politik4m3Facktencheck/blob/main/docs/KAPITEL02_MIGRATION.md) und [Kapitel 3](https://github.com/4m3projects/politik4m3Facktencheck/blob/main/docs/KAPITEL03_MIGRATION.md).

Erfolglose Zugriffe tragen direkt in sourceRefs.note den Hinweis Erfolgloser Abrufversuch – kein Sachbeleg. sources.accessBasis nennt den tatsächlichen Fehler und gegebenenfalls den separat erfolgreichen Ersatzabruf. Das bestehende Textmodell genügt dafür; ein Quellenverweis allein bedeutet keine Bestätigung. S019 bleibt als historischer Zugriffseintrag erhalten, sein Aussageverweis ist entsprechend präzisiert.

Eine Wiederholung erzeugt keine neue Aussage-ID. Ein ausschließlich wiederholender Altpunkt ohne eigene führende Aussage ist im derzeitigen Schema noch nicht darstellbar. Erst beim tatsächlichen Auftreten eine minimale Zuordnung des Altpunktursprungs am Vorkommen und dazu passende Validator-, Generator- und Zähltests ergänzen. Keine künstliche Aussage erzeugen, um die Herkunftspflicht zu umgehen. Die je 14 Altpunkte von Kapitel 2 und 3 sind sämtlich mit eigenen Prüfgegenständen vertreten; keine Schemaerweiterung erforderlich.

## Fundstellen und ihre Herkunft

Jedes Vorkommen hat id, startSeconds, endSeconds, precision, timeBasis, timeHistory und note. Die aktuelle Fundstelle muss innerhalb der Videolaufzeit liegen. precision ist Ungefähr oder Kontrolliert; eine bloße Textprüfung darf keine Audio-/Videokontrolle suggerieren.

Wird eine Fundstelle verbessert, den bisherigen Bereich mit startSeconds, endSeconds, precision und basis in timeHistory erhalten; dort steht der frühere Hinweis vollständig. timeBasis erklärt die tatsächliche neue Eingrenzung. Neue Vorkommen ohne frühere Fundstelle haben eine leere timeHistory-Liste. Im bestehenden Video wurden die zehn engeren Textbereiche übernommen, einschließlich A0008 bis 02:03:35. Sämtliche früheren Suchfenster und Hinweise bleiben lesbar.

## Sprecher, Übernahme einer Behauptung und Sicherheit

Je Vorkommen sind speakerId, candidateSpeakerId, attributionStatus, attributionBasis, legacySpeaker, role, roleStatus und roleBasis Pflicht. Bei Bestätigt ist nur speakerId gesetzt; bei Plausibel nur candidateSpeakerId; bei Ungeklärt sind beide null. Referenzen müssen im Sprecherverzeichnis existieren. legacySpeaker erhält eine alte Namensangabe oder ist null.

Identität im Metadatenkontext, konkrete Stimme und Position zur Behauptung sind getrennte Fragen. JSON3-Wechselmarken nennen keine Personen. Eine übernommene Namensangabe, Themenkenntnis oder ein Videotitel genügt nicht als Bestätigung. Ein verlässlich geprüftes Sprechertranskript oder gezielte Originalkontrolle mit nachvollziehbarer Identifizierung kann eine Bestätigung tragen. Ohne tatsächlich verwendete Audiodaten und geeignete Werkzeuge keine akustische Sprechererkennung behaupten. Namenlose, stabil identifizierte Stimmen dürfen eine SP-ID mit name null erhalten; das identifiziert keine natürliche Person namentlich.

role ist Behauptung, Ausdrückliche Zustimmung, Rückfrage, Fremdbezug, Zurückweisung oder Selbstkorrektur. roleStatus ist unabhängig von attributionStatus ebenfalls Bestätigt, Plausibel oder Ungeklärt. roleBasis begründet diese Einordnung. Ein beiläufiges Zustimmungssignal ist keine automatische Übernahme. Fragen, prüfende Wiederholungen und Zitate Dritter zählen nicht als eigene Behauptung.

Eine neue Gegenbehauptung erhält einen eigenen Prüfgegenstand und gegebenenfalls die Beziehung widerspricht. Eine korrigierende Aussage erhält die Beziehung korrigiert zur früheren, erhalten bleibenden Aussage. Ein Selbstkorrektur-Vorkommen benötigt eine solche Beziehung. Bei bestätigter Person und bestätigtem Bezug muss mindestens ein Ziel eine frühere bestätigte eigene Aussage derselben Person enthalten. Die inhaltliche Passung sämtlicher Beziehungen bleibt manuell zu prüfen.

## Sachbewertung und Bearbeitungsstatus

Nur diese sechs Kategorien sind erlaubt: Belegt, Teilweise belegt, Irreführend / Kontext fehlt, Widerlegt, Nicht ausreichend belegbar, Meinung / Prognose. Status: Offen, In Bearbeitung oder Abgeschlossen. Offene/laufende Prüfungen haben verdict null und konkrete offene Fragen. Abgeschlossene Tatsachen brauchen ein Urteil und zugeordnete Sachquellen. Nicht ausreichend belegbar ist ein begründetes abgeschlossenes Ergebnis, keine Kennzeichnung unbearbeiteter Recherche.

Die Art ist Tatsachenbehauptung, Meinung oder Prognose. Letztere verwenden abgeschlossen Meinung / Prognose und bleiben außerhalb des Tatsachen-Nenners. Quellen tatsächlich lesen; ein Quellenverweis oder Statusfeld beweist allein keine Belegprüfung. Übernommene Teilbefunde werden ausdrücklich als solche gekennzeichnet, nicht als neue Recherche ausgegeben.

## Statistik ohne Doppelzählung

uniqueStatements zählt jede eigenständige Aussage mit mindestens einem bestätigten oder plausiblen eigenen Behauptungs-, Zustimmungs- oder Selbstkorrekturbezug einmal. Die Gesamtzählung bestätigt damit keine Sprecheridentität. Ungeklärte eigene Bezüge werden separat in unresolvedRoleOccurrences und unresolvedRoleOnlyStatements geführt. Rückfragen, Fremdbezüge und Zurückweisungen werden als referenceOccurrences beziehungsweise referenceOnlyStatements getrennt ausgewiesen.

additionalAssertionOccurrences zählt weitere eigene Vorkommen nach dem ersten je Aussage, unabhängig davon, ob dieselbe oder eine andere Person spricht. sameSpeakerRepeatedAssertionOccurrences zählt dagegen ausschließlich weitere Vorkommen derselben Person bei bestätigter Sprecherzuordnung UND bestätigtem eigenem Bezug. Zustimmung einer zweiten Person erzeugt ein zusätzliches Vorkommen, aber keine Wiederholung durch den ersten Sprecher. Bei unsicherer Identität ist keine tatsächliche Personenwiederholung nachgewiesen.

Die Kategorieprozente verwenden ausschließlich abgeschlossene einmalige Tatsachen als Nenner. Nicht ausreichend belegbar bleibt darin enthalten; offene/laufende Prüfungen, Meinungen und Prognosen nicht. Bei Nenner null sind Prozente JSON-null und im Bericht nicht anwendbar. Rundung auf eine Nachkommastelle kann Abweichungen in der Summe erzeugen.

speakerStatistics enthält pro SP-ID einmalig zuverlässig zugeordnete Tatsachen, abgeschlossene/offene/laufende Prüfungen, sechs Kategorien und einen eigenen Tatsachen-Nenner. Nur bestätigte Person UND bestätigter eigener Bezug zählen. Gemeinsame ausdrückliche Übernahme wird als Vorkommen je Person an derselben Aussage erfasst: jede Person einmal, im Video einmal. Personensummen sind nicht additiv. Unsichere und teilweise bestätigte Zurechnungen werden zusätzlich ausgewiesen; Unsicherheitsmengen können sich überschneiden. Null zugeordnete Aussagen bedeutet fehlende bestätigte Zurechnung in dieser Auswahl, keine Aussage über die tatsächliche Menge gesprochener Behauptungen. Keine Glaubwürdigkeitsnoten, Rankings oder Hochrechnungen.

## Neues Video: vollständiges Beispiel

Das folgende Beispiel ist rein synthetisch und kein Faktencheck eines tatsächlichen Videos. Die ID, Laufzeit, Texte, Datumsangaben und Grundlagen durch tatsächlich ermittelte Daten ersetzen. Als aussagen.json im passenden strukturiert-Verzeichnis speichern, weitere reale Aussagen hinzufügen und anschließend den Generator mit -VideoId aufrufen. Ohne ausreichende Inhaltsgrundlage keine Behauptung erfinden.

```json
{
  "schemaVersion": 2,
  "scope": {
    "kind": "Teilbestand",
    "videoId": "VIDEO_ID_01",
    "videoUrl": "https://www.youtube.com/watch?v=VIDEO_ID_01",
    "durationSeconds": 120,
    "asOf": "2026-11-17",
    "baselineCommit": null,
    "selectedLegacyIds": [],
    "totalLegacyPoints": 0,
    "unmigratedLegacyPoints": 0,
    "researchNote": "Synthetisches Dokumentationsbeispiel; keine Sachrecherche.",
    "coverageNote": "Beispiel einer einzelnen erfassten Aussage; keine vollständige Videoanalyse."
  },
  "legacyPoints": [],
  "sources": [],
  "speakers": [],
  "claims": [{
    "id": "VIDEO_ID_01-A0001",
    "videoId": "VIDEO_ID_01",
    "chapter": 1,
    "legacyId": null,
    "kind": "Tatsachenbehauptung",
    "description": "Rein synthetischer Prüfgegenstand für die Formatdokumentation.",
    "status": "Offen",
    "verdict": null,
    "reason": "Noch keine sachliche Prüfung; keine Endbewertung.",
    "assessmentBasis": "Synthetisches Formatbeispiel.",
    "migration": {
      "changeType": "Neuerfassung",
      "mapping": "Direkt erfasst, kein Altprüfpunkt.",
      "assessmentChange": "Keine frühere Bewertung übernommen."
    },
    "sourceRefs": [],
    "openQuestions": ["Welche tatsächlichen Belege sind einschlägig?"],
    "occurrences": [{
      "id": "VIDEO_ID_01-O0001",
      "startSeconds": 10,
      "endSeconds": 20,
      "precision": "Ungefähr",
      "speakerId": null,
      "candidateSpeakerId": null,
      "attributionStatus": "Ungeklärt",
      "attributionBasis": "Im synthetischen Beispiel keine Sprecheridentifikation.",
      "legacySpeaker": null,
      "role": "Behauptung",
      "roleStatus": "Plausibel",
      "roleBasis": "Nur synthetische Kennzeichnung zur Formaterklärung.",
      "note": "Keine tatsächliche Videofundstelle.",
      "timeBasis": "Synthetischer Sekundenbereich zur Formaterklärung.",
      "timeHistory": []
    }],
    "relations": []
  }]
}
```

## Prüfen und veröffentlichen

Aus dem Repositoryhauptverzeichnis Build-Factcheck.ps1 mit -VideoId und danach -Check ausführen. Test-Factcheck.ps1 führt die Bibliothekstests und die Prüfung aller gespeicherten Datensätze aus; Test-Publication.ps1 prüft Arbeitsbaum und Index getrennt einschließlich Herkunftshashes und generierter Artefakte. Für neue Videos muss der Generator jeweils laufen, bevor der Gesamtcheck bestehen kann. Die Dokumentationsbeispiele und ein synthetisches weiteres Video werden ebenfalls getestet.

Unbekannte Dateitypen, fremde JSON-Felder, Rohdaten-/Medienmuster und zusätzliche strukturierte Artefakte sind verboten. Alle öffentlichen Texte bleiben eigenständig formuliert; keine Originalzitate oder privaten Quellenpfade. Die Technik erkennt weder beliebige Rechteverletzungen noch erfundene Nachweise zuverlässig. Vor Veröffentlichung ist eine manuelle Inhaltskontrolle erforderlich. Keine Datenbank, kein Server, keine zusätzlichen Programmbibliotheken. Skripte sind UTF-8 mit BOM für Windows PowerShell 5.1, JSON und Markdown UTF-8 ohne BOM.

Die bestehenden Bibliothekstests nutzen einen stabilen Referenzdatensatz aus der Git-Historie; die benötigten Ausgangscommits müssen verfügbar sein. Der aktuelle Arbeitsbaum wird zusätzlich vollständig geprüft. Der reale Fall der kapitelübergreifenden Wiederholung ist im [Prüfbericht zu Kapitel 1](https://github.com/4m3projects/politik4m3Facktencheck/blob/main/docs/KAPITEL01_MIGRATION.md) dokumentiert.
