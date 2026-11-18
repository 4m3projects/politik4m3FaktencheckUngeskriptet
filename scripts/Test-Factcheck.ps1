[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\','/')
. (Join-Path $PSScriptRoot 'Factcheck-Common.ps1')
# Stabile Referenz fuer die 78 bestehenden Bibliothekstests; aktuelle Daten separat pruefen.
$referenceCommit='1f2c3703bf3ca5e43ce1e7ed6c10bda807a265c9'
$referenceLines=@(& git -c ('safe.directory='+$root.Replace('\','/')) -C $root show ($referenceCommit+':faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json'))
if ($LASTEXITCODE -ne 0) { throw 'Referenzstand fehlt; Repository mit benoetigter Git-Historie bereitstellen.' }
$script:baseline=ConvertFrom-FactcheckJson ($referenceLines -join [char]10)
$script:current=ConvertFrom-FactcheckJson (Get-Content -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json') -Raw -Encoding UTF8)
# Historische Kapitelstaende bleiben feste Regressionen; Erhalt im aktuellen Bestand separat pruefen.
$chapterTwoLines=@(& git -c ('safe.directory='+$root.Replace('\','/')) -C $root show '4e622aae57453fe77790a5b709863f44bb0d9f08:faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json')
if ($LASTEXITCODE -ne 0) { throw 'Kapitel-2-Referenz fehlt.' }
$script:chapterTwo=ConvertFrom-FactcheckJson ($chapterTwoLines -join [char]10)
# Kapitel-3-Endstand (nach Gegenpruefung, in main) als feste Referenz fuer Kapitel-3-Regressionen.
$chapterThreeLines=@(& git -c ('safe.directory='+$root.Replace('\','/')) -C $root show '118400fdb012c0b33bd3799429fe84b5156fd948:faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json')
if ($LASTEXITCODE -ne 0) { throw 'Kapitel-3-Referenz fehlt.' }
$script:chapterThree=ConvertFrom-FactcheckJson ($chapterThreeLines -join [char]10)
$script:finalReview='Abschlussprüfung 18.11.2026 (Claude): '
$script:statusReview='Statusklärung 18.11.2026 (Claude): '
$script:finalReviewKeys=@('kind','status','verdict','reason','sourceRefs','openQuestions','migration')
function Get-ChapterOneView {
    $d=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:chapterTwo)
    $d.claims=@($d.claims | Where-Object chapter -NE 2)
    $d.legacyPoints=@($d.legacyPoints | Where-Object chapter -NE 2)
    $d.scope.selectedLegacyIds=@($d.legacyPoints.id)
    $d.scope.unmigratedLegacyPoints=93
    return $d
}
$results = [Collections.Generic.List[string]]::new()
function Copy-Case { ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:baseline) }
function Check-True([bool]$Value,[string]$Message) { if (-not $Value) { throw $Message } }
function Expect-Rejection([scriptblock]$Body,[string]$Pattern) {
    $rejected = $false
    try { & $Body } catch {
        if ($_.Exception.Message -notmatch $Pattern) { throw ('Falscher Ablehnungsgrund: ' + $_.Exception.Message) }
        $rejected = $true
    }
    Check-True $rejected 'Ungueltiger Fall wurde nicht abgelehnt.'
}
function Case([string]$Name,[scriptblock]$Body) {
    & $Body
    $results.Add('PASS: ' + $Name)
}
Case 'Factcheckumfang und sechs Kategorien' {
    Assert-FactcheckData $script:baseline
    $s = Get-FactcheckStatistics $script:baseline
    Check-True ($s.uniqueStatements -eq 10 -and $s.selectedLegacyPoints -eq 3 -and $s.totalLegacyPoints -eq 99) 'Falscher Umfang.'
    Check-True (($script:baseline.scope.selectedLegacyIds -join ',') -ceq 'C03-P07,C06-P09,C08-P03') 'Andere Pruefpunkte als beauftragt migriert.'
    Check-True ($s.categories.Count -eq 6) 'Zusaetzliche/fehlende Kategorien.'
}
Case 'Status, Nenner und Kategorienzaehlung' {
    $s = Get-FactcheckStatistics $script:baseline
    Check-True ($s.statusCounts.Offen -eq 5 -and $s.statusCounts.'In Bearbeitung' -eq 2 -and $s.completedFacts -eq 3) 'Statuszahlen falsch.'
    Check-True ($s.categories[0].completedCount -eq 2 -and $s.categories[0].completedFactPercent -eq 66.7 -and $s.categories[2].completedFactPercent -eq 33.3) 'Anteile falsch.'
}
Case 'Doppelte Aussage-ID' { $d=Copy-Case; $d.claims[1].id=$d.claims[0].id; Expect-Rejection { Assert-FactcheckData $d } 'Aussage-ID' }
Case 'Identischer Aussageinhalt mit neuer ID' { $d=Copy-Case; $d.claims[1].description=$d.claims[0].description; Expect-Rejection { Assert-FactcheckData $d } 'Identische Aussage' }
Case 'Doppelte Vorkommens-ID' { $d=Copy-Case; $d.claims[1].occurrences[0].id=$d.claims[0].occurrences[0].id; Expect-Rejection { Assert-FactcheckData $d } 'Vorkommens-ID' }
Case 'Dasselbe Vorkommen nicht zweimal' {
    $d=Copy-Case; $o=($d.claims[0].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json); $o.id='mlxFA9T88I0-O9000'
    $d.claims[0].occurrences += $o; Expect-Rejection { Assert-FactcheckData $d } 'Vorkommen doppelt'
}
Case 'Wiederholung erhoeht nur Vorkommen' {
    $d=Copy-Case; $o=($d.claims[0].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json)
    $o.id='mlxFA9T88I0-O9000'; $o.startSeconds=3600; $o.endSeconds=3610; $d.claims[0].occurrences += $o
    $s=Get-FactcheckStatistics $d
    Check-True ($s.uniqueStatements -eq 10 -and $s.assertionOccurrences -eq 11 -and $s.additionalAssertionOccurrences -eq 1) 'Doppelzaehlung durch Wiederholung.'
}
Case 'Ungueltige Kategorie' { $d=Copy-Case; $d.claims[2].verdict='Gemischt'; Expect-Rejection { Assert-FactcheckData $d } 'gueltige Bewertung' }
Case 'Ungueltiger Status' { $d=Copy-Case; $d.claims[0].status='Spaeter'; Expect-Rejection { Assert-FactcheckData $d } 'Status ungueltig' }
Case 'Offene Aussage ohne erzwungenes Urteil' { $d=Copy-Case; $d.claims[0].verdict='Nicht ausreichend belegbar'; Expect-Rejection { Assert-FactcheckData $d } 'keine Endbewertung' }
Case 'Abgeschlossen erfordert Urteil' { $d=Copy-Case; $d.claims[2].verdict=$null; Expect-Rejection { Assert-FactcheckData $d } 'gueltige Bewertung' }
Case 'Abgeschlossene Tatsache braucht Quelle' { $d=Copy-Case; $d.claims[2].sourceRefs=@(); Expect-Rejection { Assert-FactcheckData $d } 'Sachquelle' }
Case 'Fehlender Quellenverweis' { $d=Copy-Case; $d.claims[2].sourceRefs[0].sourceId='S999'; Expect-Rejection { Assert-FactcheckData $d } 'Quellenverweis' }
Case 'Doppelte Quellen-ID' { $d=Copy-Case; $d.sources[1].id=$d.sources[0].id; Expect-Rejection { Assert-FactcheckData $d } 'Quellen-ID' }
Case 'Falsches Datum' { $d=Copy-Case; $d.sources[0].accessedOn='2026-02-30'; Expect-Rejection { Assert-FactcheckData $d } 'Abrufdatum' }
Case 'Nicht-HTTPS-Quelle' { $d=Copy-Case; $d.sources[0].url='file:///private'; Expect-Rejection { Assert-FactcheckData $d } 'HTTPS' }
Case 'Zeit ausserhalb der Laufzeit' { $d=Copy-Case; $d.claims[0].occurrences[0].endSeconds=11167; Expect-Rejection { Assert-FactcheckData $d } 'Bereichs' }
Case 'Rueckwaerts laufender Zeitbereich' { $d=Copy-Case; $d.claims[0].occurrences[0].endSeconds=10; Expect-Rejection { Assert-FactcheckData $d } 'vor seinem Anfang' }
Case 'Sekunden muessen ganzzahlig sein' { $d=Copy-Case; $d.claims[0].occurrences[0].startSeconds=1.5; Expect-Rejection { Assert-FactcheckData $d } 'ganzzahlig' }
Case 'Fehlende Herkunft' { $d=Copy-Case; $d.claims[0].legacyId='C09-P99'; Expect-Rejection { Assert-FactcheckData $d } 'Herkunftszuordnung' }
Case 'Kapitel stimmt mit Herkunft ueberein' { $d=Copy-Case; $d.claims[0].chapter=4; Expect-Rejection { Assert-FactcheckData $d } 'Kapitelzuordnung' }
Case 'Unbekannte Datenfelder zurueckweisen' {
    $d=Copy-Case; $d | Add-Member -NotePropertyName rawTranscript -NotePropertyValue 'synthetischer Test'
    Expect-Rejection { Assert-FactcheckData $d } 'unbekanntes Feld'
}
Case 'Untertitelmuster auch nach JSON-Dekodierung' {
    $d=Copy-Case; $d.claims[0].reason='[00:00:00] Synthetische Testzeile, kein Quellinhalt.'
    $encoded=ConvertTo-FactcheckJson $d
    Expect-Rejection { Assert-FactcheckData (ConvertFrom-FactcheckJson $encoded) } 'Rohquellen'
}
Case 'Medienmuster in JSON-Werten' {
    $d=Copy-Case; $d.claims[0].reason='data:image/png;base64,SYNTHETISCH'
    Expect-Rejection { Assert-FactcheckData $d } 'Medien'
}
Case 'Null abgeschlossene Tatsachen bedeutet keine Prozente' {
    $d=Copy-Case
    foreach ($c in $d.claims) { $c.status='Offen'; $c.verdict=$null; $c.openQuestions=@('Synthetische offene Testfrage.') }
    $s=Get-FactcheckStatistics $d
    Check-True ($s.percentageDenominator -eq 0 -and @($s.categories | Where-Object { $null -ne $_.completedFactPercent }).Count -eq 0) 'Division durch null oder falsche Nullprozente.'
}
Case 'Meinung getrennt vom Tatsachen-Nenner' {
    $d=Copy-Case; $d.claims[0].kind='Meinung'; $d.claims[0].status='Abgeschlossen'; $d.claims[0].verdict='Meinung / Prognose'
    $s=Get-FactcheckStatistics $d
    Check-True ($s.kindCounts.Meinung -eq 1 -and $s.percentageDenominator -eq 3 -and $s.categories[5].completedCount -eq 1 -and $null -eq $s.categories[5].completedFactPercent) 'Meinung verfaelscht Nenner.'
}
Case 'Prognose getrennt vom Tatsachen-Nenner' {
    $d=Copy-Case; $d.claims[0].kind='Prognose'; $d.claims[0].status='Abgeschlossen'; $d.claims[0].verdict='Meinung / Prognose'
    $s=Get-FactcheckStatistics $d
    Check-True ($s.kindCounts.Prognose -eq 1 -and $s.percentageDenominator -eq 3) 'Prognose verfaelscht Nenner.'
}
Case 'Nicht ausreichend belegbar ist ein abgeschlossenes Ergebnis' {
    $d=Copy-Case; $d.claims[0].status='Abgeschlossen'; $d.claims[0].verdict='Nicht ausreichend belegbar'
    $d.claims[0].sourceRefs=@([pscustomobject]@{sourceId='S001';note='Synthetischer Test einer Belegzuordnung, keine neue Sachbewertung.'})
    $s=Get-FactcheckStatistics $d
    Check-True ($s.percentageDenominator -eq 4 -and $s.categories[4].completedCount -eq 1 -and $s.categories[4].completedFactPercent -eq 25) 'Abgeschlossenes unzureichend belegbares Ergebnis fehlt.'
}
Case 'Fremdbezug und Zurueckweisung sind keine eigene Wiederholung' {
    foreach ($role in @('Fremdbezug','Zurückweisung')) {
        $d=Copy-Case; $d.claims[0].occurrences[0].role=$role
        $s=Get-FactcheckStatistics $d
        Check-True ($s.uniqueStatements -eq 9 -and $s.referenceOnlyStatements -eq 1 -and $s.referenceOccurrences -eq 1 -and $s.additionalAssertionOccurrences -eq 0) 'Referenz wurde als eigene Behauptung gezaehlt.'
    }
}
Case 'Korrekturen und Gegenargumente explizit verknuepfen' {
    $d=Copy-Case; $d.claims[1].relations=@([pscustomobject]@{type='korrigiert';claimId=$d.claims[0].id;note='Synthetische Beziehung, kein tatsaechlicher Videobefund.'})
    Assert-FactcheckData $d
    $d.claims[1].relations[0].type='widerspricht'; Assert-FactcheckData $d
    $d.claims[1].relations[0].claimId='mlxFA9T88I0-A9999'; Expect-Rejection { Assert-FactcheckData $d } 'Gegenargumentbeziehung'
}
# Ausschliesslich synthetisch bestaetigte Zuordnungen; keine neuen Videobefunde.
function Confirm-Occurrence($Occurrence,[string]$SpeakerId='SP02') {
    $Occurrence.speakerId=$SpeakerId; $Occurrence.candidateSpeakerId=$null
    $Occurrence.attributionStatus='Bestätigt'; $Occurrence.roleStatus='Bestätigt'
    $Occurrence.attributionBasis='Synthetisch bestaetigte Sprecherzuordnung fuer den Test, keine Originalkontrolle.'
    $Occurrence.roleBasis='Synthetisch bestaetigter eigener Aussagebezug fuer den Test.'
}
Case 'Schema 1 wird nicht stillschweigend aufgewertet' {
    $d=Copy-Case; $d.schemaVersion=1; Expect-Rejection { Assert-FactcheckData $d } 'Schemaversion'
    $d=Copy-Case; $d.claims[0].occurrences[0] | Add-Member -NotePropertyName speaker -NotePropertyValue 'Synthetischer alter Freitext'
    Expect-Rejection { Assert-FactcheckData $d } 'unbekanntes Feld'
}
Case 'Engere Fundstellen erhalten ungefaehre Original-Suchfenster' {
    foreach ($c in $script:baseline.claims) {
        $o=$c.occurrences[0]; $start=3380; $end=3539
        if ($c.legacyId -ceq 'C06-P09') {$start=7249;$end=7405}
        if ($c.legacyId -ceq 'C08-P03') {$start=8350;$end=8420}
        Check-True ($o.timeHistory.Count -eq 1 -and $o.timeHistory[0].startSeconds -eq $start -and $o.timeHistory[0].endSeconds -eq $end -and $o.timeHistory[0].precision -ceq 'Ungefähr') 'Alte Zeitmarke oder Herkunft verloren.'
        Check-True ($o.precision -ceq 'Ungefähr' -and $o.timeBasis.Contains('keine Audio-/Videokontrolle')) 'Scheinpraezise Zeitmarke.'
    }
    $o=$script:baseline.claims[7].occurrences[0]
    Check-True ($o.startSeconds -eq 7405 -and $o.endSeconds -eq 7415 -and $o.timeHistory[0].endSeconds -eq 7405) 'Anschlussluecke nicht nachvollziehbar behoben.'
}
Case 'Echte Factcheckzuordnungen werden nicht automatisch bestaetigt' {
    $s=Get-FactcheckStatistics $script:baseline; $p=$s.speakerStatistics
    Check-True ($script:baseline.schemaVersion -eq 2 -and $script:baseline.speakers.Count -eq 2) 'Schema/Sprecherverzeichnis falsch.'
    Check-True ($p.reliablyAssignedFacts -eq 0 -and $p.factsWithoutReliablePerson -eq 10 -and $p.factsWithUncertainAttribution -eq 10) 'Altzuordnung wurde bestaetigt.'
    Check-True ($p.occurrenceAttributionCounts.Plausibel -eq 10 -and $p.occurrenceRoleStatusCounts.Plausibel -eq 10) 'Plausibilitaet fehlt.'
    foreach ($c in $script:baseline.claims) {
        $o=$c.occurrences[0]
        Check-True ($o.legacySpeaker -ceq 'Lüning' -and $null -eq $o.speakerId -and $o.candidateSpeakerId -ceq 'SP02') 'Altangabe verloren oder aufgewertet.'
    }
    foreach ($person in $p.persons) {
        Check-True ($person.uniqueFacts -eq 0 -and $person.percentageDenominator -eq 0 -and @($person.categories | Where-Object {$null -ne $_.completedFactPercent}).Count -eq 0) 'Null-Nenner der Person falsch.'
    }
}
Case 'Bestaetigte Person mit bestaetigtem Bezug wird gezaehlt' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[2].occurrences[0]
    $s=Get-FactcheckStatistics $d; $p=$s.speakerStatistics.persons[1]
    Check-True ($p.uniqueFacts -eq 1 -and $p.completedFacts -eq 1 -and $p.categories[0].completedFactPercent -eq 100 -and $s.speakerStatistics.reliablyAssignedFacts -eq 1) 'Bestaetigte Zuordnung fehlt.'
}
Case 'Unbekannte bestaetigte und vermutete Sprecher-ID' {
    foreach ($field in @('speakerId','candidateSpeakerId')) {
        $d=Copy-Case; $d.claims[0].occurrences[0].$field='SP99'
        Expect-Rejection { Assert-FactcheckData $d } 'Unbekannte Sprecher-ID'
    }
}
Case 'Sprecher-IDs sind eindeutig und gross-kleinschreibungstreu' {
    $d=Copy-Case; $d.speakers[1].id='SP01'; Expect-Rejection { Assert-FactcheckData $d } 'Sprecher-ID'
    $d=Copy-Case; $d.claims[0].occurrences[0].candidateSpeakerId='sp02'; Expect-Rejection { Assert-FactcheckData $d } 'Sprecher-ID'
}
Case 'Zuordnungsstatus verlangt konsistente IDs' {
    $d=Copy-Case; $d.claims[0].occurrences[0].attributionStatus='Bestätigt'; Expect-Rejection { Assert-FactcheckData $d } 'Bestaetigte Zuordnung'
    $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0]; $d.claims[0].occurrences[0].attributionStatus='Plausibel'
    Expect-Rejection { Assert-FactcheckData $d } 'Plausible Zuordnung'
    $d=Copy-Case; $d.claims[0].occurrences[0].attributionStatus='Ungeklärt'; Expect-Rejection { Assert-FactcheckData $d } 'Ungeklaerte Zuordnung'
}
Case 'Ungeklaerte Sprecher ohne Kandidaten sind erlaubt und separat gezaehlt' {
    $d=Copy-Case; $o=$d.claims[0].occurrences[0]; $o.candidateSpeakerId=$null; $o.attributionStatus='Ungeklärt'
    $s=Get-FactcheckStatistics $d
    Check-True ($s.uniqueStatements -eq 10 -and $s.speakerStatistics.occurrenceAttributionCounts.Ungeklärt -eq 1 -and $s.speakerStatistics.factsWithoutReliablePerson -eq 10) 'Ungeklaerte Zuordnung falsch gezaehlt.'
}
Case 'Grundlagen und gueltige Sicherheitsstufen sind Pflicht' {
    foreach ($field in @('attributionBasis','roleBasis')) {
        $d=Copy-Case; $d.claims[0].occurrences[0].$field=''; Expect-Rejection { Assert-FactcheckData $d } 'nichtleerer Text'
    }
    foreach ($field in @('attributionStatus','roleStatus')) {
        $d=Copy-Case; $d.claims[0].occurrences[0].$field='Sicherlich'; Expect-Rejection { Assert-FactcheckData $d } 'Zuordnungsstatus'
    }
    $d=Copy-Case; $d.speakers[1].identityBasis=''; Expect-Rejection { Assert-FactcheckData $d } 'nichtleerer Text'
}
Case 'Anonyme identifizierte Stimme ist ohne erfundenen Namen moeglich' {
    $d=Copy-Case; $d.speakers[1].name=$null; Confirm-Occurrence $d.claims[0].occurrences[0]
    $s=Get-FactcheckStatistics $d
    Check-True ($s.speakerStatistics.persons[1].uniqueFacts -eq 1 -and $null -eq $s.speakerStatistics.persons[1].name) 'Unbenannte Sprecherkennung unmoeglich.'
    $a=Get-FactcheckArtifacts $d; Check-True ($a['berichte/kapitel-03.md'].Contains('SP02')) 'Sprecher-ID als Namensersatz fehlt.'
}
Case 'Rueckfrage Fremdzitat und Zurueckweisung zaehlen auch bestaetigt nicht' {
    foreach ($role in @('Rückfrage','Fremdbezug','Zurückweisung')) {
        $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0]; $d.claims[0].occurrences[0].role=$role
        $s=Get-FactcheckStatistics $d
        Check-True ($s.uniqueStatements -eq 9 -and $s.speakerStatistics.persons[1].uniqueFacts -eq 0) 'Referierender Bezug als eigene Behauptung gezaehlt.'
    }
}
Case 'Unsicherer Aussagebezug verhindert regulaere Personenzurechnung' {
    foreach ($status in @('Plausibel','Ungeklärt')) {
        $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0]; $d.claims[0].occurrences[0].roleStatus=$status
        $s=Get-FactcheckStatistics $d
        Check-True ($s.speakerStatistics.persons[1].uniqueFacts -eq 0 -and $s.speakerStatistics.factsWithUncertainOwnRole -eq 10) 'Unsicherer Bezug als sicher gezaehlt.'
        $expected=10; if ($status -ceq 'Ungeklärt') {$expected=9}
        Check-True ($s.uniqueStatements -eq $expected) 'Ungeklaerter Bezug ging in Gesamt-Hauptzaehlung ein.'
        if ($status -ceq 'Ungeklärt') {
            Check-True ($s.unresolvedRoleOccurrences -eq 1 -and $s.unresolvedRoleOnlyStatements -eq 1 -and $s.referenceOccurrences -eq 0 -and $s.referenceOnlyStatements -eq 0) 'Ungeklaerter Bezug wurde zum Fremdbezug umgedeutet.'
        }
    }
}
Case 'Bestaetigter Bezug ersetzt keine bestaetigte Person' {
    $d=Copy-Case; $d.claims[0].occurrences[0].roleStatus='Bestätigt'
    $s=Get-FactcheckStatistics $d
    Check-True ($s.speakerStatistics.reliablyAssignedFacts -eq 0 -and $s.uniqueStatements -eq 10) 'Bezugssicherheit wurde zu Personensicherheit.'
}
Case 'Wiederholung derselben Person erhoeht keine Personenzahl' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[2].occurrences[0]
    $o=$d.claims[2].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $o.id='mlxFA9T88I0-O9000'; $o.startSeconds=3600; $o.endSeconds=3610; $d.claims[2].occurrences += $o
    $s=Get-FactcheckStatistics $d
    Check-True ($s.uniqueStatements -eq 10 -and $s.speakerStatistics.persons[1].uniqueFacts -eq 1 -and $s.speakerStatistics.persons[1].completedFacts -eq 1) 'Personendoppelzaehlung.'
}
Case 'Gemeinsame ausdrueckliche Zustimmung zaehlt je Person und insgesamt einmal' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[2].occurrences[0]
    $o=$d.claims[2].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $o.id='mlxFA9T88I0-O9000'; $o.role='Ausdrückliche Zustimmung'; Confirm-Occurrence $o 'SP01'
    $d.claims[2].occurrences += $o
    $s=Get-FactcheckStatistics $d
    Check-True ($s.uniqueStatements -eq 10 -and $s.completedFacts -eq 3 -and $s.speakerStatistics.reliablyAssignedFacts -eq 1) 'Gemeinsame Aussage insgesamt doppelt.'
    foreach ($p in $s.speakerStatistics.persons) { Check-True ($p.uniqueFacts -eq 1 -and $p.completedFacts -eq 1) 'Gemeinsame Zustimmung nicht je Person gezaehlt.' }
    $d.claims[2].occurrences[1].roleStatus='Plausibel'; $s=Get-FactcheckStatistics $d
    Check-True ($s.speakerStatistics.persons[0].uniqueFacts -eq 0 -and $s.speakerStatistics.persons[1].uniqueFacts -eq 1) 'Unsichere Mit-Zustimmung regulaer gezaehlt.'
}
Case 'Teilweise bestaetigte Zurechnung behaelt unsichere weitere Person sichtbar' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[2].occurrences[0]
    $o=$d.claims[2].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $o.id='mlxFA9T88I0-O9000'; $o.role='Ausdrückliche Zustimmung'; $o.speakerId=$null; $o.candidateSpeakerId='SP01'; $o.attributionStatus='Plausibel'
    $d.claims[2].occurrences += $o; $s=Get-FactcheckStatistics $d
    Check-True ($s.speakerStatistics.reliablyAssignedFacts -eq 1 -and $s.speakerStatistics.factsWithoutReliablePerson -eq 9 -and $s.speakerStatistics.factsWithUncertainAttribution -eq 10) 'Teilzuordnung verdeckt Unsicherheit.'
}
Case 'Eigene Selbstkorrektur bleibt mit frueherer Aussage verknuepft' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0]; Confirm-Occurrence $d.claims[1].occurrences[0]
    $o=$d.claims[1].occurrences[0]; $o.role='Selbstkorrektur'; $o.startSeconds=3600; $o.endSeconds=3610
    $d.claims[1].relations=@([pscustomobject]@{type='korrigiert';claimId=$d.claims[0].id;note='Synthetische Selbstkorrektur, kein Videobefund.'})
    $s=Get-FactcheckStatistics $d
    Check-True ($s.uniqueStatements -eq 10 -and $s.speakerStatistics.persons[1].uniqueFacts -eq 2) 'Korrektur loescht alte Aussage oder fehlt.'
    $d.claims[1].relations=@(); Expect-Rejection { Assert-FactcheckData $d } 'Selbstkorrektur braucht'
}
Case 'Selbstkorrektur darf nicht fremde oder spaetere Behauptung sein' {
    $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0] 'SP01'; Confirm-Occurrence $d.claims[1].occurrences[0]
    $o=$d.claims[1].occurrences[0]; $o.role='Selbstkorrektur'; $o.startSeconds=3600; $o.endSeconds=3610
    $d.claims[1].relations=@([pscustomobject]@{type='korrigiert';claimId=$d.claims[0].id;note='Synthetische Beziehung.'})
    Expect-Rejection { Assert-FactcheckData $d } 'derselben Person'
    Confirm-Occurrence $d.claims[0].occurrences[0]; $d.claims[0].occurrences[0].startSeconds=3700; $d.claims[0].occurrences[0].endSeconds=3710
    Expect-Rejection { Assert-FactcheckData $d } 'derselben Person'
}
Case 'Personenstatistik trennt offene laufende und abgeschlossene Pruefungen' {
    $d=Copy-Case; foreach ($c in $d.claims) { Confirm-Occurrence $c.occurrences[0] }
    $s=Get-FactcheckStatistics $d; $p=$s.speakerStatistics.persons[1]
    Check-True ($p.uniqueFacts -eq 10 -and $p.completedFacts -eq 3 -and $p.openFacts -eq 5 -and $p.inProgressFacts -eq 2) 'Personenstatus falsch.'
    Check-True ($p.percentageDenominator -eq 3 -and $p.categories[0].completedCount -eq 2 -and $p.categories[0].completedFactPercent -eq 66.7 -and $p.categories[2].completedFactPercent -eq 33.3) 'Personen-Nenner oder Kategorien falsch.'
}
Case 'Meinungen und Prognosen bleiben ausserhalb der Personen-Faktenstatistik' {
    foreach ($kind in @('Meinung','Prognose')) {
        $d=Copy-Case; Confirm-Occurrence $d.claims[0].occurrences[0]; $d.claims[0].kind=$kind; $d.claims[0].status='Abgeschlossen'; $d.claims[0].verdict='Meinung / Prognose'
        $s=Get-FactcheckStatistics $d
        Check-True ($s.speakerStatistics.persons[1].uniqueFacts -eq 0 -and $s.percentageDenominator -eq 3) 'Nicht-Tatsache in Personenfakten.'
    }
}
Case 'Berichte machen Unsicherheiten und Altzuordnung sichtbar' {
    $a=Get-FactcheckArtifacts $script:baseline; $r=$a['berichte/kapitel-03.md']
    Check-True ($r.Contains('Kandidat: Horst Lüning') -and $r.Contains('Sprecherzuordnung: **Plausibel**') -and $r.Contains('Erhaltene Altzuordnung: Lüning') -and $r.Contains('Personenstatistik: ausgeschlossen')) 'Unsicherheitsdarstellung fehlt.'
    Check-True ($a['README.md'].Contains('Keine Glaubwuerdigkeitsnote') -and $a['README.md'].Contains('Null zugeordnete Tatsachen')) 'Statistikgrenzen fehlen.'
}
Case 'Rechtefilter gilt auch fuer neue Sprecherfelder' {
    $d=Copy-Case; $d.speakers[0].identityBasis='[00:00:00] Synthetischer Test.'
    Expect-Rejection { Assert-FactcheckData $d } 'Rohquellen'
    $d=Copy-Case; $d.claims[0].occurrences[0].attributionBasis='data:audio/mp3;base64,SYNTHETISCH'
    Expect-Rejection { Assert-FactcheckData $d } 'Medien'
}
Case 'Zusaetzliche Vorkommen sind keine bestaetigten Personenwiederholungen' {
    $d=Copy-Case; $o=$d.claims[0].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $o.id='mlxFA9T88I0-O9000';$o.startSeconds=3600;$o.endSeconds=3610;$d.claims[0].occurrences += $o
    $s=Get-FactcheckStatistics $d
    Check-True ($s.additionalAssertionOccurrences -eq 1 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0) 'Plausible Zuordnung als sichere Wiederholung dargestellt.'
    foreach ($o in $d.claims[0].occurrences) { Confirm-Occurrence $o }
    $s=Get-FactcheckStatistics $d
    Check-True ($s.sameSpeakerRepeatedAssertionOccurrences -eq 1 -and $s.uniqueStatements -eq 10) 'Wiederholung derselben bestaetigten Person falsch.'
}
Case 'Zustimmung einer zweiten Person ist keine Wiederholung derselben Person' {
    $d=Copy-Case;Confirm-Occurrence $d.claims[0].occurrences[0]
    $o=$d.claims[0].occurrences[0] | ConvertTo-Json -Depth 10 | ConvertFrom-Json
    $o.id='mlxFA9T88I0-O9000';$o.role='Ausdrückliche Zustimmung';Confirm-Occurrence $o 'SP01';$d.claims[0].occurrences += $o
    $s=Get-FactcheckStatistics $d
    Check-True ($s.additionalAssertionOccurrences -eq 1 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0 -and $s.speakerStatistics.reliablyAssignedFacts -eq 1) 'Zweite Person als Wiederholung des ersten Sprechers dargestellt.'
}
Case 'Zeithistorie braucht gueltige Grenzen und echte Grundlage' {
    $d=Copy-Case;$d.claims[0].occurrences[0].timeHistory[0].endSeconds=1;Expect-Rejection {Assert-FactcheckData $d} 'Historischer Zeitbereich'
    $d=Copy-Case;$d.claims[0].occurrences[0].timeHistory[0].basis='';Expect-Rejection {Assert-FactcheckData $d} 'nichtleerer Text'
    $d=Copy-Case;$d.claims[0].occurrences[0].timeBasis='';Expect-Rejection {Assert-FactcheckData $d} 'nichtleerer Text'
}
Case 'Teilbestand und Migrationsabdeckung werden nicht als Gesamtvideo ausgegeben' {
    $s=Get-FactcheckStatistics $script:baseline;$a=Get-FactcheckArtifacts $script:baseline
    Check-True ($s.scope -ceq 'Teilbestand' -and $s.selectedLegacyPoints -eq 3 -and $s.totalLegacyPoints -eq 99 -and $a['README.md'].Contains('Keine Statistik des vollständigen Videos')) 'Teilabdeckung verschleiert.'
    $d=Copy-Case;$d.scope.kind='Vollbestand';Expect-Rejection {Assert-FactcheckData $d} 'kein Vollbestand'
}
function New-SyntheticVideo {
    $d=Copy-Case;$newId='TESTvideo01'
    $d.scope.videoId=$newId;$d.scope.videoUrl='https://www.youtube.com/watch?v='+$newId
    $d.scope.baselineCommit=$null;$d.scope.selectedLegacyIds=@();$d.scope.totalLegacyPoints=0;$d.scope.unmigratedLegacyPoints=0
    $d.scope.coverageNote='Synthetischer Teilbestand eines anderen Videos, keine Videobehauptungen.'
    $d.legacyPoints=@();$d.claims=@($d.claims[0]);$d.claims[0].legacyId=$null
    $d.claims[0].videoId=$newId;$d.claims[0].id=$newId+'-A0001';$d.claims[0].chapter=12
    $d.claims[0].occurrences[0].id=$newId+'-O0001';$d.claims[0].occurrences[0].timeHistory=@()
    return $d
}
Case 'Weiteres Video ohne Altpunkte braucht keine Programmaenderung' {
    $d=New-SyntheticVideo;Assert-FactcheckData $d;$s=Get-FactcheckStatistics $d;$a=Get-FactcheckArtifacts $d
    Check-True ($s.uniqueStatements -eq 1 -and $s.totalLegacyPoints -eq 0 -and $a.Contains('berichte/kapitel-12.md') -and $a['berichte/kapitel-12.md'].Contains($d.claims[0].id)) 'Direkte Neuerfassung fehlt in Berichten.'
    $texts=@{};$prefix='faktenchecks/'+$d.scope.videoId+'/strukturiert/';$texts[$prefix+'aussagen.json']=ConvertTo-FactcheckJson $d
    foreach ($key in $a.Keys) {$texts[$prefix+$key]=$a[$key]}
    Assert-FactcheckCollection $texts
}
Case 'Verwaiste Artefakte eines weiteren Videos werden abgelehnt' {
    $d=New-SyntheticVideo;$a=Get-FactcheckArtifacts $d;$texts=@{};$prefix='faktenchecks/'+$d.scope.videoId+'/strukturiert/'
    $texts[$prefix+'aussagen.json']=ConvertTo-FactcheckJson $d
    foreach($key in $a.Keys){$texts[$prefix+$key]=$a[$key]}
    $texts['faktenchecks/ORPHANvid01/strukturiert/statistik.json']='{}'
    Expect-Rejection {Assert-FactcheckCollection $texts} 'ohne zentrale Daten'
}
Case 'Erzeugung deterministisch und drei Beispielberichte' {
    $a=Get-FactcheckArtifacts $script:baseline; $b=Get-FactcheckArtifacts $script:baseline
    Check-True ($a.Count -eq 6 -and @($a.Keys | Where-Object { $_ -like 'berichte/*' }).Count -eq 3) 'Falsche Artefaktzahl.'
    foreach ($key in $a.Keys) { Check-True ($a[$key] -ceq $b[$key]) 'Nichtdeterministisches Ergebnis.' }
}
Case 'JSON-Zahlenformat 0 und 0.0 aendert nicht die Bedeutung' {
    $a=ConvertFrom-FactcheckJson '{"zahl":0}'
    $b=ConvertFrom-FactcheckJson '{"zahl":0.0}'
    Check-True (Test-FactcheckEqual $a $b) 'Numerisch identische JSON-Zahlen wurden ungleich behandelt.'
}
Case 'String statt statistischer Zahl wird nicht akzeptiert' {
    $a=ConvertFrom-FactcheckJson '{"zahl":2}'
    $b=ConvertFrom-FactcheckJson '{"zahl":"2"}'
    Check-True (-not (Test-FactcheckEqual $a $b)) 'Statistikvergleich akzeptierte falschen Zahlentyp.'
}
Case 'Bestehende Quellenbelege und Alttexte erhalten' {
    foreach ($l in $script:baseline.legacyPoints) {
        $text=Get-Content -LiteralPath (Join-Path $root $l.path) -Raw -Encoding UTF8
        Check-True ((Get-FactcheckTextHash $text) -ceq $l.fileSha256) 'Herkunftshash geaendert.'
        $pattern='(?ms)^## Prüfpunkt ' + $l.point + '\r?\n(.*?)(?=^## (?:Prüfpunkt \d+|Kapitel-Fazit)|\z)'
        $section=[regex]::Match($text,$pattern).Value.Trim()
        Check-True ((Normalize-FactcheckText $section) -ceq (Normalize-FactcheckText $l.section)) 'Alttext unvollstaendig.'
    }
}
# Der existierende Publikationspruefer liest Arbeitsbaum und Index nur.
. (Join-Path $PSScriptRoot 'Test-Publication.ps1') -Root $root
Case 'Dokumentiertes JSON-Beispiel ist vollstaendig valide' {
    $doc=Get-Content -LiteralPath (Join-Path $root 'docs/STRUKTURIERTE_DATEN.md') -Raw -Encoding UTF8
    $examples=[regex]::Matches($doc,'(?s)```json\s*(.*?)\s*```')
    Check-True ($examples.Count -eq 1) 'Dokumentationsbeispiel fehlt.'
    $d=ConvertFrom-FactcheckJson $examples[0].Groups[1].Value
    Assert-FactcheckData $d; $a=Get-FactcheckArtifacts $d
    Check-True ($a.Contains('berichte/kapitel-01.md')) 'Dokumentationsbeispiel laesst sich nicht generieren.'
}
Case 'Mehrere Videos im selben Snapshot bleiben unabhaengig' {
    $texts=$workTexts.Clone();$d=New-SyntheticVideo;$prefix='faktenchecks/'+$d.scope.videoId+'/strukturiert/'
    $texts[$prefix+'aussagen.json']=ConvertTo-FactcheckJson $d;$a=Get-FactcheckArtifacts $d
    foreach($key in $a.Keys){$texts[$prefix+$key]=$a[$key]}
    Assert-FactcheckCollection $texts
    $texts[$prefix+'statistik.json']='{}';Expect-Rejection {Assert-FactcheckCollection $texts} 'Factcheckartefakt'
}
Case 'Unbekannte strukturierte Ausgabepfade werden abgelehnt' {
    $texts=$workTexts.Clone();$texts['faktenchecks/mlxFA9T88I0/strukturiert/berichte/fremd.md']='Synthetischer Zusatz.'
    Expect-Rejection {Assert-FactcheckCollection $texts} 'Unbekanntes Factcheckartefakt'
}
Case 'Alte Sonderstruktur und alte Skriptnamen sind entfernt' {
    $oldNames=@(Get-ChildItem -LiteralPath $root -Recurse -Force | Where-Object {$_.Name -imatch 'pi[l]ot'})
    Check-True ($oldNames.Count -eq 0) 'Alte Sonderstruktur vorhanden.'
    foreach($f in Get-ChildItem -LiteralPath $root -File -Recurse) {
        Check-True (-not ((Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8) -imatch 'pi[l]ot')) 'Veralteter Verweis in oeffentlicher Datei.'
    }
}
Case 'Kapitel 1 vollstaendig migriert und die zehn Ausgangsaussagen erhalten' {
    $d=Get-ChapterOneView;Assert-FactcheckData $d
    $chapter=Get-Content -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/kapitel/01_auftakt.md') -Raw -Encoding UTF8
    $numbers=@([regex]::Matches($chapter,'(?m)^## Prüfpunkt (\d+)') | ForEach-Object {[int]$_.Groups[1].Value})
    Check-True ($numbers.Count -eq 3) 'Unerwarteter Kapitel-1-Umfang.'
    foreach($n in $numbers){$id='C01-P{0:00}' -f $n;Check-True (@($d.legacyPoints | Where-Object id -CEQ $id).Count -eq 1 -and $d.scope.selectedLegacyIds -ccontains $id) 'Altpruefpunkt fehlt oder doppelt.'}
    Check-True ($d.claims.Count -eq 18 -and @($d.claims | Where-Object chapter -EQ 1).Count -eq 8 -and $d.scope.unmigratedLegacyPoints -eq 93 -and $d.scope.totalLegacyPoints -eq 99) 'Migrationszaehlung falsch.'
    foreach($old in $script:baseline.claims){
        $now=@($d.claims | Where-Object id -CEQ $old.id)[0]
        foreach($key in $old.PSObject.Properties.Name){
            if($key -eq 'occurrences'){
                Check-True ($now.occurrences.Count -ge $old.occurrences.Count) 'Alte Fundstellen verloren.'
                for($i=0;$i -lt $old.occurrences.Count;$i++){Check-True (Test-FactcheckEqual $now.occurrences[$i] $old.occurrences[$i]) 'Alte Fundstelle oder Sprecherangabe veraendert.'}
            } else {Check-True (Test-FactcheckEqual $now.$key $old.$key) ('Ausgangsaussage veraendert: '+$old.id+' '+$key)}
        }
    }
    for($i=0;$i -lt $script:baseline.sources.Count;$i++){Check-True (Test-FactcheckEqual $d.sources[$i] $script:baseline.sources[$i]) 'Alte Sachquelle veraendert.'}
    Check-True (Test-FactcheckEqual $d.speakers $script:baseline.speakers) 'Sprecherverzeichnis ungewollt veraendert.'
}
Case 'Kapiteluebergreifender Teaser ist ein Vorkommen und keine neue Aussage' {
    $d=Get-ChapterOneView;$c=@($d.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0007')[0];$s=Get-FactcheckStatistics $d;$a=Get-FactcheckArtifacts $d
    Check-True ($c.occurrences.Count -eq 2 -and $c.occurrences[1].id -ceq 'mlxFA9T88I0-O0019' -and $c.occurrences[1].startSeconds -eq 30 -and $c.occurrences[1].note.Contains('C01-P03')) 'Herkunft der Wiederholung fehlt.'
    Check-True ($s.uniqueStatements -eq 18 -and $s.assertionOccurrences -eq 19 -and $s.additionalAssertionOccurrences -eq 1 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0 -and $s.speakerStatistics.reliablyAssignedFacts -eq 0) 'Doppelzaehlung oder unsichere Person als sicher behandelt.'
    foreach($id in @('C01-P01','C01-P02','C01-P03','A0007','O0019')){Check-True ($a['berichte/kapitel-01.md'].Contains($id)) 'Kapitelbericht verschweigt Herkunft oder vorhandene Aussage.'}
    Check-True ($s.statusCounts.Abgeschlossen -eq 5 -and $s.statusCounts.Offen -eq 6 -and $s.statusCounts.'In Bearbeitung' -eq 7 -and $s.completedFacts -eq 4 -and $s.kindCounts.Prognose -eq 1) 'Neue Statistik falsch.'
}
Case 'Redaktionelle Auslegungsunsicherheit erhaelt keine Endbewertung' {
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0012')[0]
    Check-True ($c.status -ceq 'Nicht überprüfbar' -and $null -eq $c.verdict -and $c.openQuestions.Count -gt 0 -and $c.reason.StartsWith('Nicht überprüfbar – ')) 'Unsichere Auslegung abschliessend bewertet.'
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0011')[0]
    Check-True ($c.verdict -ceq 'Belegt' -and $c.migration.assessmentChange.Contains($script:finalReview) -and $c.reason.Contains('September 2026')) 'Abschlussbewertung ohne Zeitbezug oder Dokumentation.'
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0014')[0]
    $src=@($script:current.sources | Where-Object id -CEQ 'S009')[0]
    Check-True ($c.verdict -ceq 'Belegt' -and $src.details.Contains('gedruckte Seite 17 / PDF-Seite 23')) 'Sachbewertung oder korrigierte Seitenangabe verloren.'
}
Case 'Neutrale Quellenbeschriftung erhaelt uebernommene und neue Zugriffsgrundlagen' {
    $a=Get-FactcheckArtifacts $script:current
    foreach($pair in @(@('berichte/kapitel-03.md','S001'),@('berichte/kapitel-01.md','S008'))){
        $src=@($script:current.sources | Where-Object id -CEQ $pair[1])[0];$body=$a[$pair[0]]
        Check-True ($body.Contains('Quellenzugriff am '+$src.accessedOn) -and $body.Contains($src.accessBasis)) 'Quellenzugriffsgrundlage verloren.'
        Check-True (-not $body.Contains('  Abruf des Erststands: ')) 'Alte pauschale Beschriftung im aktuellen Bericht.'
    }
}
Case 'Historische Indexbeschriftung bleibt eng begrenzt und Arbeitsbaum strikt' {
    $expected="Quelle"+[char]10+'  Quellenzugriff am 2026-11-17. Unveraenderte Grundlage.'+[char]10
    $old=$expected.Replace('  Quellenzugriff am ','  Abruf des Erststands: ')
    Check-True (-not (Test-FactcheckArtifactEqual 'berichte/kapitel-03.md' $old $expected)) 'Veraltete Arbeitsbaumbeschriftung akzeptiert.'
    Check-True (Test-FactcheckArtifactEqual 'berichte/kapitel-03.md' $old $expected -AllowLegacySourceLabel) 'Historischer Index nicht lesbar.'
    Check-True (-not (Test-FactcheckArtifactEqual 'berichte/kapitel-03.md' ($old+'Manipulation') $expected -AllowLegacySourceLabel)) 'Indexkompatibilitaet laesst andere Aenderungen durch.'
    Check-True (-not (Test-FactcheckArtifactEqual 'migration.md' $old $expected -AllowLegacySourceLabel)) 'Kompatibilitaet ausserhalb der erzeugten Kapitelberichte.'
    Check-True ($legacyIndexSourceLabel -eq $indexTexts['scripts/Factcheck-Common.ps1'].Contains("`$report.Add('  Abruf des Erststands: '")) 'Indexkompatibilitaet unabhaengig vom dortigen Renderer eingeschaltet.'
}
Case 'Kapitel 2 vollstaendig und ohne weitere Kapitel migriert' {
    $d=$script:chapterTwo;Assert-FactcheckData $d
    $old=Get-Content -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/kapitel/02_plattformen.md') -Raw -Encoding UTF8
    $numbers=@([regex]::Matches($old,'(?m)^## Prüfpunkt (\d+)') | ForEach-Object {[int]$_.Groups[1].Value})
    Check-True ($numbers.Count -eq 14 -and $d.legacyPoints.Count -eq 20 -and $d.scope.unmigratedLegacyPoints -eq 79 -and $d.scope.kind -ceq 'Teilbestand') 'Kapitelumfang oder Teilbestand falsch.'
    foreach($n in $numbers){$id='C02-P{0:00}' -f $n;Check-True (@($d.legacyPoints | Where-Object id -CEQ $id).Count -eq 1 -and @($d.claims | Where-Object legacyId -CEQ $id).Count -gt 0) 'Altpunkt fehlt oder nur scheinbar uebertragen.'}
    Check-True (($d.claims | Where-Object chapter -EQ 2).Count -eq 58 -and $d.claims.Count -eq 76) 'Einzelaussagen fehlen.'
    Check-True ((@($d.scope.selectedLegacyIds | Where-Object {$_ -notlike 'C02-*'}) -join ',') -ceq 'C03-P07,C06-P09,C08-P03,C01-P01,C01-P02,C01-P03') 'Andere Kapitel mitmigriert.'
}
Case 'Alle 18 bisherigen Aussagen und Quellen bleiben erhalten' {
    $referenceGitArgs=@('-c',('safe.directory='+$root.Replace('\','/')),'-C',$root,'show','c90d691ee1838d1d08b445e5f66cf198969e2675:faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json')
    $lines=@(& git @referenceGitArgs);Check-True ($LASTEXITCODE -eq 0) 'Kapitel-1-Referenz fehlt.'
    $before=ConvertFrom-FactcheckJson ($lines -join [char]10)
    foreach($old in $before.claims){
        if($old.id -ceq 'mlxFA9T88I0-A0015'){
            $ref=@($old.sourceRefs | Where-Object sourceId -CEQ 'S019')[0]
            $ref.note='Erfolgloser Abrufversuch – kein Sachbeleg. '+$ref.note
        }
        $now=@($script:chapterTwo.claims | Where-Object id -CEQ $old.id)
        Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) ('Bisherige Aussage veraendert: '+$old.id)
    }
    foreach($old in $before.sources){$now=@($script:chapterTwo.sources | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Bisherige Quelle veraendert.'}
    foreach($old in $before.legacyPoints){$now=@($script:chapterTwo.legacyPoints | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Bisherige Herkunft veraendert.'}
}
Case 'Reale Sperrwiederholung wird nur einmal als Aussage gezaehlt' {
    $d=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:chapterTwo)
    $c=@($d.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0032')[0]
    Check-True ($c.occurrences.Count -eq 3) 'Sperrwiederholungen fehlen.'
    $before=Get-FactcheckStatistics $d;$c.occurrences=@($c.occurrences[0]);$after=Get-FactcheckStatistics $d
    Check-True ($before.uniqueStatements -eq $after.uniqueStatements -and $before.assertionOccurrences -eq ($after.assertionOccurrences+2) -and $before.additionalAssertionOccurrences -eq ($after.additionalAssertionOccurrences+2)) 'Wiederholung erhoeht Aussagenzahl.'
}
Case 'Erklaerungsversuch mit Rueckfrage und Zurueckweisung zaehlt nicht als eigene Aussage' {
    $d=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:chapterTwo)
    $c=@($d.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0038')[0]
    Check-True (($c.occurrences.role -join ',') -ceq 'Rückfrage,Zurückweisung' -and $null -eq $c.verdict) 'Ungewisse Ursache als uebernommene Tatsache behandelt.'
    $before=Get-FactcheckStatistics $d;$d.claims=@($d.claims | Where-Object id -CNE $c.id);$after=Get-FactcheckStatistics $d
    Check-True ($before.referenceOnlyStatements -eq 1 -and $after.referenceOnlyStatements -eq 0 -and $before.uniqueStatements -eq $after.uniqueStatements -and (Test-FactcheckEqual $before.statusCounts $after.statusCounts)) 'Nur erwaehnte These beeinflusst eigene Faktenstatistik.'
}
Case 'Erfolglose Quellenabrufe stehen direkt an den betroffenen Aussagen' {
    $a=Get-FactcheckArtifacts $script:chapterTwo
    foreach($id in @('S019','S035','S036','S038','S039')){
        $refs=@($script:chapterTwo.claims.sourceRefs | Where-Object sourceId -CEQ $id)
        Check-True ($refs.Count -gt 0) ('Fehlender Fehlerhinweis: '+$id)
        foreach($ref in $refs){Check-True ($ref.note.StartsWith('Erfolgloser Abrufversuch – kein Sachbeleg.')) 'Fehlversuch als Sachbeleg dargestellt.'}
        $report=$a['berichte/kapitel-02.md'];if($id -ceq 'S019'){$report=$a['berichte/kapitel-01.md']}
        $source=@($script:chapterTwo.sources | Where-Object id -CEQ $id)[0]
        foreach($ref in $refs){Check-True ($report.Contains($source.url) -and $report.Contains($ref.note)) ('Fehlversuch im Bericht verschwiegen: '+$id)}
    }
}
Case 'Neue Sprecherkandidaten werden nicht zu bestaetigten Personen' {
    $s=Get-FactcheckStatistics $script:chapterTwo
    Check-True ($s.speakerStatistics.reliablyAssignedFacts -eq 0 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0 -and $s.speakerStatistics.occurrenceAttributionCounts.Bestätigt -eq 0) 'Textkandidat als sichere Identitaet gezaehlt.'
    foreach($c in @($script:chapterTwo.claims | Where-Object chapter -EQ 2)){foreach($o in $c.occurrences){Check-True ($null -eq $o.speakerId -and $o.attributionStatus -ceq 'Plausibel' -and $o.roleStatus -ceq 'Plausibel') 'Unbegruendet bestaetigtes Vorkommen.'}}
}
Case 'Engere Kapitel-2-Fundstellen erhalten die alten Suchfenster' {
    foreach($c in @($script:chapterTwo.claims | Where-Object chapter -EQ 2)){foreach($o in $c.occurrences){Check-True ($o.precision -ceq 'Ungefähr' -and $o.timeHistory.Count -ge 1 -and $o.timeBasis.Contains('Originaluntertitel')) 'Zeitgrundlage oder Historie fehlt.'}}
    $c=@($script:chapterTwo.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0062')[0]
    Check-True ($c.occurrences[0].endSeconds -gt $c.occurrences[0].timeHistory[0].endSeconds -and $c.description.Contains('bis vor Kurzem') -and $null -eq $c.verdict) 'Anschlussstelle oder historischer Vorbehalt verloren.'
}
Case 'Kapitel-2-Referenz trennt Datensaetze Vorkommen und Tatsachen-Nenner' {
    $s=Get-FactcheckStatistics $script:chapterTwo
    Check-True ($s.statementRecords -eq 76 -and $s.uniqueStatements -eq 75 -and $s.assertionOccurrences -eq 88 -and $s.referenceOccurrences -eq 6 -and $s.additionalAssertionOccurrences -eq 13) 'Aktuelle Zaehler falsch.'
    Check-True ($s.statusCounts.Abgeschlossen -eq 20 -and $s.statusCounts.Offen -eq 30 -and $s.statusCounts.'In Bearbeitung' -eq 25 -and $s.completedFacts -eq 15) 'Status oder Tatsachen-Nenner falsch.'
    Check-True ($s.categories[0].completedCount -eq 6 -and $s.categories[1].completedCount -eq 7 -and $s.categories[2].completedCount -eq 2 -and $s.categories[5].completedCount -eq 5) 'Kategorien falsch.'
    Check-True ($s.selectedLegacyPoints -eq 20 -and $s.totalLegacyPoints -eq 99 -and $s.coverageNote.Contains('Keine Statistik des vollständigen Videos')) 'Teilbestandskennzeichnung verloren.'
}
Case 'Kapitel 3 deckt alle 14 Altpunkte ab und startet keine weitere Migration' {
    $d=$script:chapterThree;Assert-FactcheckData $d
    $old=Get-Content -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/kapitel/03_unternehmen.md') -Raw -Encoding UTF8
    $numbers=@([regex]::Matches($old,'(?m)^## Prüfpunkt (\d+)') | ForEach-Object {[int]$_.Groups[1].Value})
    Check-True ($numbers.Count -eq 14 -and $d.legacyPoints.Count -eq 33 -and $d.scope.unmigratedLegacyPoints -eq 66 -and $d.scope.kind -ceq 'Teilbestand') 'Kapitel-3-Umfang falsch.'
    foreach($n in $numbers){$id='C03-P{0:00}' -f $n;Check-True (@($d.legacyPoints | Where-Object id -CEQ $id).Count -eq 1 -and @($d.claims | Where-Object legacyId -CEQ $id).Count -gt 0) 'Kapitel-3-Altpunkt fehlt.'}
    $new=@($d.claims | Where-Object {$_.id -cnotin $script:chapterTwo.claims.id})
    Check-True ($new.Count -eq 102 -and @($new | Where-Object chapter -NE 3).Count -eq 0 -and @($new | Where-Object {$null -eq $_.legacyId}).Count -eq 3) 'Zusatzinhalte oder Kapitelgrenze falsch.'
}
Case 'Kapitel-2-Bestand bleibt bis auf dokumentierte Domainfortschreibung erhalten' {
    foreach($old in $script:chapterTwo.claims){
        $now=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson @($script:chapterThree.claims | Where-Object id -CEQ $old.id)[0])
        if($old.id -ceq 'mlxFA9T88I0-A0002'){
            foreach($field in @('status','verdict','reason','assessmentBasis','sourceRefs','openQuestions')){$now.$field=$old.$field}
            $now.migration.assessmentChange=$old.migration.assessmentChange
        }
        if($old.id -ceq 'mlxFA9T88I0-A0003'){
            $now.occurrences=@($now.occurrences | Where-Object {$_.id -cin $old.occurrences.id})
            $now.sourceRefs=@($now.sourceRefs | Where-Object sourceId -CNE 'S060');$now.assessmentBasis=$old.assessmentBasis
        }
        Check-True (Test-FactcheckEqual $now $old) ('Undokumentierte Altbestandsaenderung: '+$old.id)
    }
    foreach($old in $script:chapterTwo.sources){$now=@($script:chapterThree.sources | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Alte Quellengrundlage veraendert.'}
    foreach($old in $script:chapterTwo.legacyPoints){$now=@($script:chapterThree.legacyPoints | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Alte Herkunft veraendert.'}
}
Case 'Domainerwerb bekommt begrenzten neuen Beleg ohne Preis oder Rang zu erfinden' {
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0002')[0]
    Check-True ($c.status -ceq 'Abgeschlossen' -and $c.verdict -ceq 'Teilweise belegt' -and ($c.sourceRefs.sourceId -join ',') -ceq 'S040,S056' -and $c.migration.assessmentChange.Contains('bisher Offen')) 'Neue Erwerbsgrundlage nicht begrenzt dokumentiert.'
    foreach($id in @('mlxFA9T88I0-A0001','mlxFA9T88I0-A0004')){$c=@($script:current.claims | Where-Object id -CEQ $id)[0];Check-True ($c.status -cin @('Offen','Nicht überprüfbar') -and $null -eq $c.verdict) 'Registrierungsabstand oder Rang unbegruendet bestaetigt.'}
}
Case 'Domainerinnerung erzeugt Vorkommen statt doppelter Kaufbehauptung' {
    $d=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:current);$c=@($d.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0003')[0]
    Check-True ($c.occurrences.Count -eq 2 -and $c.occurrences[1].candidateSpeakerId -ceq 'SP01' -and $c.verdict -ceq 'Belegt') 'Kaufereignis oder neuer Kandidat verloren.'
    $before=Get-FactcheckStatistics $d;$c.occurrences=@($c.occurrences[0]);$after=Get-FactcheckStatistics $d
    Check-True ($before.uniqueStatements -eq $after.uniqueStatements -and $before.additionalAssertionOccurrences -eq ($after.additionalAssertionOccurrences+1) -and $before.sameSpeakerRepeatedAssertionOccurrences -eq 0) 'Erinnerung doppelt oder als sichere Personenwiederholung gezaehlt.'
}
Case 'Erneut gescheiterte Kaufquelle wird nicht als neue Verifikation dargestellt' {
    $src=@($script:current.sources | Where-Object id -CEQ 'S060')[0]
    Check-True ($src.accessBasis.StartsWith('Erfolgloser Abrufversuch – kein Sachbeleg.') -and $src.accessBasis.Contains('Zeitüberschreitung')) 'Fehlerzugriff verschwiegen.'
    foreach($ref in @($script:current.claims.sourceRefs | Where-Object sourceId -CEQ 'S060')){Check-True ($ref.note.StartsWith('Erfolgloser Abrufversuch – kein Sachbeleg.')) 'Fehlerzugriff als Sachbeleg dargestellt.'}
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0003')[0]
    Check-True ($c.assessmentBasis.Contains('Keine neue Bestätigung') -and ($c.sourceRefs.sourceId -contains 'S001') -and ($c.sourceRefs.sourceId -contains 'S060')) 'Alte Grundlage mit neuem Zugriff verwechselt.'
}
Case 'Unsichere Rechtslesart Internetkurzform und historisches Baudatum bleiben ohne Endurteil' {
    foreach($id in @('mlxFA9T88I0-A0094','mlxFA9T88I0-A0105','mlxFA9T88I0-A0162')){
        $c=@($script:current.claims | Where-Object id -CEQ $id)[0];Check-True ($null -eq $c.verdict -and $c.status -ceq 'Nicht überprüfbar' -and $c.openQuestions.Count -gt 0 -and $c.reason.StartsWith('Nicht überprüfbar – ')) 'Mehrdeutigkeit als abgeschlossen ausgegeben.'
    }
    $c=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0143')[0]
    Check-True ($c.occurrences[0].role -ceq 'Rückfrage' -and -not (Test-FactcheckOwnRole $c.occurrences[0])) 'Frage zur EU-Herkunft als eigene Tatsachenbehauptung gezaehlt.'
}
Case 'Kapitel-3-Sprecher und Zeiten bleiben unabhaengig vom Sachurteil unsicher' {
    $new=@($script:chapterThree.claims | Where-Object {$_.id -cnotin $script:chapterTwo.claims.id})
    foreach($c in $new){foreach($o in $c.occurrences){
        Check-True ($null -eq $o.speakerId -and $o.attributionStatus -ceq 'Plausibel' -and $o.roleStatus -ceq 'Plausibel' -and $o.precision -ceq 'Ungefähr' -and $o.timeBasis.Contains('Originaluntertitel')) 'Textbefund als Personen- oder Zeitbestaetigung ausgegeben.'
        Check-True (($null -ne $c.legacyId -and $o.timeHistory.Count -eq 1) -or ($null -eq $c.legacyId -and $o.timeHistory.Count -eq 0)) 'Altzeit oder Neuerfassung falsch behandelt.'
    }}
    $s=Get-FactcheckStatistics $script:chapterThree
    Check-True ($s.speakerStatistics.reliablyAssignedFacts -eq 0 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0) 'Unbelegte Personenstatistik.'
}
Case 'Kapitel-3-Endstand trennt Migration Forschung und Referenzfragen' {
    $s=Get-FactcheckStatistics $script:chapterThree
    Check-True ($s.statementRecords -eq 178 -and $s.uniqueStatements -eq 176 -and $s.referenceOnlyStatements -eq 2 -and $s.assertionOccurrences -eq 197 -and $s.referenceOccurrences -eq 8 -and $s.additionalAssertionOccurrences -eq 21) 'Aktuelle Vorkommenszaehlung falsch.'
    Check-True ($s.statusCounts.Abgeschlossen -eq 51 -and $s.statusCounts.Offen -eq 65 -and $s.statusCounts.'In Bearbeitung' -eq 60 -and $s.completedFacts -eq 42) 'Aktueller Forschungsstand falsch.'
    Check-True ($s.categories[0].completedCount -eq 9 -and $s.categories[1].completedCount -eq 27 -and $s.categories[2].completedCount -eq 6 -and $s.categories[5].completedCount -eq 9) 'Aktuelle Kategorien falsch.'
    Check-True ($s.selectedLegacyPoints -eq 33 -and $s.totalLegacyPoints -eq 99 -and $s.coverageNote.Contains('Keine Statistik des vollständigen Videos')) 'Teilbestand verloren.'
}
# Ab Kapitel 4: fortlaufende Kapitelmigrationen durch Claude (18.11.2026). Je neuem Kapitel Altpunktzahl, Zeitfenster und Endstand ergaenzen.
$script:laterChapters=@{4=11;5=13;6=11;7=8;8=16;9=7;10=2}
$script:laterRanges=@{4=@(4500,5290);5=@(5270,6530);6=@(6500,7530);7=@(7490,8290);8=@(8260,10330);9=@(10290,10990);10=@(10970,11166)}
$script:laterExtraOccurrences=@('mlxFA9T88I0-A0011','mlxFA9T88I0-A0012','mlxFA9T88I0-A0013','mlxFA9T88I0-A0014','mlxFA9T88I0-A0015','mlxFA9T88I0-A0016','mlxFA9T88I0-A0017','mlxFA9T88I0-A0018')
Case 'Spaetere Kapitel decken alle Altpunkte ab und bleiben im Kapitel' {
    $d=$script:current;Assert-FactcheckData $d
    foreach($ch in @($script:laterChapters.Keys | Sort-Object)){
        $file=@(Get-ChildItem -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/kapitel') -Filter ('{0:00}_*.md' -f $ch))[0]
        $old=Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
        $numbers=@([regex]::Matches($old,'(?m)^## Prüfpunkt (\d+)') | ForEach-Object {[int]$_.Groups[1].Value})
        Check-True ($numbers.Count -eq $script:laterChapters[$ch]) ('Altpunktzahl Kapitel '+$ch)
        foreach($n in $numbers){$id='C{0:00}-P{1:00}' -f $ch,$n;Check-True (@($d.legacyPoints | Where-Object id -CEQ $id).Count -eq 1 -and @($d.claims | Where-Object legacyId -CEQ $id).Count -gt 0) ('Altpunkt fehlt: '+$id)}
        $rg=$script:laterRanges[$ch]
        foreach($c in @($d.claims | Where-Object {$_.chapter -eq $ch -and $_.id -cnotin $script:chapterThree.claims.id})){
            $hasLegacy=$null -ne $c.legacyId
            if($hasLegacy){Check-True ($c.legacyId.StartsWith(('C{0:00}-' -f $ch))) ('Herkunft falsch: '+$c.id)}
            foreach($o in $c.occurrences){
                Check-True ($null -eq $o.speakerId -and $o.attributionStatus -ceq 'Plausibel' -and $o.precision -ceq 'Ungefähr' -and $o.startSeconds -ge $rg[0] -and $o.endSeconds -le $rg[1]) ('Fundstelle, Zeit oder Sprecher unzulaessig: '+$o.id)
                Check-True (($hasLegacy -and $o.timeHistory.Count -eq 1) -or (-not $hasLegacy -and $o.timeHistory.Count -eq 0)) ('Altzeit oder Neuerfassung falsch: '+$o.id)
            }
        }
    }
}
Case 'Kapitel-3-Bestand bleibt bis auf dokumentierte Hauptgespraechsvorkommen erhalten' {
    foreach($old in $script:chapterThree.claims){
        $now=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson @($script:current.claims | Where-Object id -CEQ $old.id)[0])
        $added=@($now.occurrences | Where-Object {$_.id -cnotin $old.occurrences.id})
        if($added.Count){
            Check-True ($script:laterExtraOccurrences -ccontains $old.id) ('Unerwartetes Zusatzvorkommen: '+$old.id)
            foreach($o in $added){Check-True ($o.timeHistory[0].basis -match 'Altpunkt C(0[4-9]|10)-P' -and $o.note.Contains('Bewertung von')) ('Zusatzvorkommen ohne Herkunft: '+$o.id)}
            $now.occurrences=@($now.occurrences | Where-Object {$_.id -cin $old.occurrences.id})
        }
        if($now.migration.assessmentChange.Contains($script:finalReview) -or $now.migration.assessmentChange.Contains($script:statusReview)){
            Check-True ($now.migration.assessmentChange.StartsWith($old.migration.assessmentChange.Trim())) ('Abschlusspruefung ueberschreibt Migrationsgeschichte: '+$old.id)
            foreach($key in $script:finalReviewKeys){$now.$key=$old.$key}
        }
        Check-True (Test-FactcheckEqual $now $old) ('Undokumentierte Altbestandsaenderung: '+$old.id)
    }
    foreach($old in $script:chapterThree.sources){$now=@($script:current.sources | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Alte Quellengrundlage veraendert.'}
    foreach($old in $script:chapterThree.legacyPoints){$now=@($script:current.legacyPoints | Where-Object id -CEQ $old.id);Check-True ($now.Count -eq 1 -and (Test-FactcheckEqual $now[0] $old)) 'Alte Herkunft veraendert.'}
}
Case 'Nicht Ueberpruefbares ist eigener Status ohne Endurteil, Ungeprueftes bleibt Offen' {
    $new=@($script:current.claims | Where-Object {$_.id -cnotin $script:chapterThree.claims.id})
    $marked=@($new | Where-Object {$_.reason.StartsWith('Nicht überprüfbar – ')})
    Check-True ($marked.Count -ge 10) 'Kennzeichnung fehlt.'
    foreach($c in $marked){Check-True ($c.status -ceq 'Nicht überprüfbar' -and $null -eq $c.verdict -and $c.openQuestions.Count -gt 0) ('Nicht Ueberpruefbares falsch eingestuft: '+$c.id)}
    foreach($c in @($script:current.claims | Where-Object status -CEQ 'Offen')){Check-True ($c.reason.StartsWith('Noch nicht geprüft – ') -and $c.migration.assessmentChange.Contains($script:statusReview)) ('Offene Aussage ohne Kennzeichnung als noch nicht geprueft: '+$c.id)}
    Check-True (@($script:current.claims | Where-Object status -CEQ 'In Bearbeitung').Count -eq 0) 'Laufende Pruefung ohne Abschluss.'
    $d=ConvertFrom-FactcheckJson (ConvertTo-FactcheckJson $script:current);$c=@($d.claims | Where-Object status -CEQ 'Offen')[0];$c.reason='Nicht überprüfbar – getarnte offene Prüfung.'
    Expect-Rejection { Assert-FactcheckData $d } 'nur mit Status'
    $c.status='Nicht überprüfbar';$c.reason='Noch nicht geprüft – Status ohne passenden Grund.'
    Expect-Rejection { Assert-FactcheckData $d } 'Begruendung mit'
    Check-True ($script:current.scope.coverageNote.StartsWith('Recherche weitgehend abgeschlossen') -and $script:current.scope.coverageNote.Contains('Keine Statistik des vollständigen Videos')) 'Abschlussvermerk oder Teilbestandsgrenze fehlt.'
}
Case 'Berliner Quote nach Zeitstand und Laendervergleich getrennt' {
    $q=@($script:current.claims | Where-Object {$_.legacyId -ceq 'C04-P07'})
    Check-True ($q.Count -eq 2 -and $q[0].verdict -ceq 'Teilweise belegt' -and $q[1].verdict -ceq 'Widerlegt' -and ($q[1].sourceRefs.sourceId -contains 'S063')) 'Berliner Quote oder Bremen-Vergleich falsch.'
    $src=@($script:current.sources | Where-Object id -CEQ 'S063')[0]
    Check-True ($src.details.Contains('28.08.2026') -and $src.details.Contains('Vor der Aufnahme')) 'Damaliger Informationsstand nicht dokumentiert.'
}
Case 'Zinsreihe und Restlaufzeit an amtlichen Daten statt Erinnerung bewertet' {
    $z=@($script:current.claims | Where-Object {$_.legacyId -ceq 'C05-P01'})
    Check-True ($z.Count -eq 3 -and $z[0].verdict -ceq 'Belegt' -and $z[1].verdict -ceq 'Widerlegt' -and $z[2].verdict -ceq 'Irreführend / Kontext fehlt') 'Zinsreihe falsch bewertet.'
    $l=@($script:current.claims | Where-Object {$_.legacyId -ceq 'C05-P02'})[0]
    Check-True ($l.verdict -ceq 'Widerlegt' -and ($l.sourceRefs.sourceId -contains 'S072')) 'Restlaufzeit falsch bewertet.'
    $i=@($script:current.claims | Where-Object {$_.legacyId -ceq 'C05-P09' -and $_.occurrences.Count -eq 2})[0]
    Check-True ($i.occurrences[1].role -ceq 'Zurückweisung' -and $null -eq $i.verdict) 'Zurueckweisung der Staatsinsolvenzthese falsch.'
}
Case 'Aktueller Endstand trennt Migration Forschung und Referenzfragen' {
    $s=Get-FactcheckStatistics $script:current
    Check-True ($s.statementRecords -eq 395 -and $s.uniqueStatements -eq 392 -and $s.referenceOnlyStatements -eq 3 -and $s.assertionOccurrences -eq 436 -and $s.referenceOccurrences -eq 11 -and $s.additionalAssertionOccurrences -eq 44) 'Aktuelle Vorkommenszaehlung falsch.'
    Check-True ($s.statusCounts.Abgeschlossen -eq 206 -and $s.statusCounts.Offen -eq 36 -and $s.statusCounts.'Nicht überprüfbar' -eq 150 -and $s.statusCounts.'In Bearbeitung' -eq 0 -and $s.completedFacts -eq 126 -and $s.openFacts -eq 36 -and $s.unverifiableFacts -eq 150) 'Aktueller Forschungsstand falsch.'
    Check-True ((($s.categories | ForEach-Object {$_.completedCount}) -join ',') -ceq '35,63,19,7,2,80') 'Aktuelle Kategorien falsch.'
    Check-True ($script:current.scope.unmigratedLegacyPoints -eq 0 -and $script:current.scope.kind -ceq 'Teilbestand') 'Vollstaendige Migration darf ohne Vollpruefung kein Vollbestand sein.'
    $w=@($script:current.claims | Where-Object id -CEQ 'mlxFA9T88I0-A0207')[0]
    Check-True ($w.verdict -ceq 'Belegt' -and ($w.sourceRefs.sourceId -join ',') -ceq 'S100' -and $w.migration.assessmentChange.Contains('Kapitel-7-Prüfung')) 'Fortschreibung A0207 nicht dokumentiert.'
    Check-True ($s.selectedLegacyPoints -eq 99 -and $s.totalLegacyPoints -eq 99 -and $s.speakerStatistics.reliablyAssignedFacts -eq 0 -and $s.sameSpeakerRepeatedAssertionOccurrences -eq 0) 'Teilbestand oder Personenstatistik falsch.'
}
Case 'JSON, Statistik und Markdown stimmen ueberein' { Assert-FactcheckCollection $workTexts }
Case 'Veraltete Statistik wird zurueckgewiesen' {
    $m=$workTexts.Clone(); $m['faktenchecks/mlxFA9T88I0/strukturiert/statistik.json']='{}'
    Expect-Rejection { Assert-FactcheckCollection $m } 'Factcheckartefakt'
}
Case 'Manuell geaenderter generierter Bericht wird erkannt' {
    $m=$workTexts.Clone(); $m['faktenchecks/mlxFA9T88I0/strukturiert/berichte/kapitel-03.md'] += 'Synthetische Aenderung.'
    Expect-Rejection { Assert-FactcheckCollection $m } 'Factcheckartefakt'
}
Case 'Gekuerzter Herkunftstext wird zurueckgewiesen' {
    $d=Copy-Case; $d.legacyPoints[0].section='Unvollstaendig'
    $m=$workTexts.Clone(); $m['faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json']=ConvertTo-FactcheckJson $d
    Expect-Rejection { Assert-FactcheckCollection $m } 'Alttext'
}
Case 'Unbekanntes Factcheckartefakt wird blockiert' {
    $m=$workTexts.Clone(); $m['faktenchecks/mlxFA9T88I0/strukturiert/fremd.json']='{}'
    Expect-Rejection { Assert-FactcheckCollection $m } 'Unbekanntes Factcheckartefakt'
}
function Expect-FileRejection([string]$Path,[string]$Text) {
    $before=$problems.Count
    Test-PublicFile $Path $Text 'Synthetischer Test'
    $blocked=$problems.Count -gt $before
    while ($problems.Count -gt $before) { $problems.RemoveAt($problems.Count-1) }
    Check-True $blocked 'Publikations-Dateifilter liess unerlaubte Datei durch.'
}
Case 'JSON ausserhalb der gezielten Factcheckpfade bleibt verboten' { Expect-FileRejection 'faktenchecks/mlxFA9T88I0/daten.json' '{}' }
Case 'Video-Metadaten und Beziehungsdatei nur an festen Pfaden zugelassen' {
    $before=$problems.Count
    Test-PublicFile 'faktenchecks/mlxFA9T88I0/video.json' '{}' 'Synthetischer Test'
    Test-PublicFile 'faktenchecks/beziehungen.json' '{}' 'Synthetischer Test'
    Check-True ($problems.Count -eq $before) 'Zugelassene Metadatenpfade wurden blockiert.'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/beziehungen.json' '{}'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/video.json' '{}'
    Expect-FileRejection 'faktenchecks/zu-kurz/video.json' '{}'
}
Case 'Rhetorik-Ebene nur als rhetorik.json neben video.json zugelassen' {
    $before=$problems.Count
    Test-PublicFile 'faktenchecks/mlxFA9T88I0/rhetorik.json' '{}' 'Synthetischer Test'
    Check-True ($problems.Count -eq $before) 'Zugelassener Rhetorikpfad wurde blockiert.'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/rhetorik.json' '{}'
    Expect-FileRejection 'faktenchecks/rhetorik.json' '{}'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/rhetorik.json' '> Synthetisches Blockzitat'
}
Case 'Beliebige JSON-Datei im Factcheck bleibt verboten' { Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/raw.json' '{}' }
Case 'Medien und Transkripte bleiben verboten' {
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/media.jpg' 'synthetischer Test'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/source.json3' '{}'
    Expect-FileRejection 'faktenchecks/mlxFA9T88I0/strukturiert/README.md' '[00:00:00] Synthetischer Test.'
}
Case 'Index-Snapshot wird eigenstaendig validiert' {
    $snapshot=$workTexts.Clone()
    $snapshot['faktenchecks/mlxFA9T88I0/strukturiert/statistik.json']='{}'
    Expect-Rejection { Assert-FactcheckCollection $snapshot } 'Factcheckartefakt'
    Assert-FactcheckCollection $workTexts
}
Case 'Alle 14 veroeffentlichten Berichtdateien und Lizenz unveraendert' {
    $gitArgs=@('-c',('safe.directory='+$root.Replace('\','/')),'-C',$root)
    $tree=@(& git @gitArgs ls-tree -r $script:baseline.scope.baselineCommit -- faktenchecks LICENSE)
    if ($LASTEXITCODE -ne 0) { throw 'Baseline nicht lesbar.' }
    Check-True ($tree.Count -eq 15) 'Unerwarteter Baselineumfang.'
    foreach ($entry in $tree) {
        if ($entry -notmatch '^100644 blob ([0-9a-f]+)\t(.+)$') { throw 'Ungueltiger Baselineeintrag.' }
        $expected=$Matches[1]; $path=$Matches[2]
        $actual=& git @gitArgs hash-object -- (Join-Path $root $path)
        if ($LASTEXITCODE -ne 0) { throw 'Dateihash nicht lesbar.' }
        Check-True ($actual -ceq $expected) ('Veroeffentlichte Datei veraendert: '+$path)
    }
}
Case 'Lokale Factcheck-Markdownlinks existieren' {
    foreach ($f in Get-ChildItem -LiteralPath $root -Filter '*.md' -File -Recurse) {
        $body=Get-Content -LiteralPath $f.FullName -Raw -Encoding UTF8
        foreach ($m in [regex]::Matches($body,'\]\(([^)]+)\)')) {
            $link=$m.Groups[1].Value
            if ($link -notmatch '^(https?://|#)') {
                Check-True (Test-Path -LiteralPath (Join-Path $f.DirectoryName $link)) ('Fehlender Factchecklink: '+$link)
            }
        }
    }
}
Case 'PowerShell-Skripte syntaktisch gueltig' {
    foreach ($f in Get-ChildItem -LiteralPath (Join-Path $root 'scripts') -Filter '*.ps1' -File) {
        $tokens=$null; $errors=$null
        $null=[Management.Automation.Language.Parser]::ParseFile($f.FullName,[ref]$tokens,[ref]$errors)
        Check-True (@($errors).Count -eq 0) ('Syntaxfehler: '+$f.Name)
    }
}
$results | ForEach-Object { Write-Host $_ }
Write-Host ('BESTANDEN: ' + $results.Count + ' Testfaelle. Nur synthetische Negativdaten im Speicher; keine Dateien geschrieben, kein Netzabruf.')
