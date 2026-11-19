# Gemeinsame Factcheckfunktionen; keine Netzwerkaufrufe und keine Dateischreibzugriffe.
$script:FactcheckVerdicts = @('Belegt','Teilweise belegt','Irreführend / Kontext fehlt','Widerlegt','Nicht ausreichend belegbar','Meinung / Prognose')
$script:FactcheckStatuses = @('Offen','In Bearbeitung','Nicht überprüfbar','Abgeschlossen')
# Pruefstatus siehe docs/AGENTEN_PRUEFSTATUS.md: Offen = noch nicht geprueft (Arbeitsauftrag), In Bearbeitung = Pruefung laeuft,
# Nicht überprüfbar = abschliessend ohne Urteil, weil es grundsaetzlich keine oeffentliche Pruefgrundlage gibt,
# Abgeschlossen = Urteil (einschliesslich Nicht ausreichend belegbar nach tatsaechlicher Recherche).
$script:FactcheckUnverifiablePrefix = 'Nicht überprüfbar – '
$script:FactcheckKinds = @('Tatsachenbehauptung','Meinung','Prognose')

function Assert-FactcheckKeys($Object,[string[]]$Keys,[string]$Context) {
    if ($null -eq $Object -or $Object -isnot [pscustomobject]) { throw "$Context muss ein JSON-Objekt sein." }
    $actual = @($Object.PSObject.Properties.Name)
    foreach ($key in $Keys) { if ($actual -cnotcontains $key) { throw "$Context fehlt Feld $key." } }
    foreach ($key in $actual) { if ($Keys -cnotcontains $key) { throw "$Context unbekanntes Feld $key." } }
}
function Assert-FactcheckText($Text,[string]$Context) {
    if ($Text -isnot [string] -or [string]::IsNullOrWhiteSpace($Text)) { throw "$Context muss ein nichtleerer Text sein." }
}
function Assert-FactcheckArray($Value,[string]$Context) {
    if ($Value -isnot [array]) { throw "$Context muss eine JSON-Liste sein." }
}
function Assert-FactcheckInteger($Value,[int]$Min,[int]$Max,[string]$Context) {
    if ($Value -isnot [int] -and $Value -isnot [long]) { throw "$Context muss ganzzahlig sein." }
    if ($Value -lt $Min -or $Value -gt $Max) { throw "$Context liegt ausserhalb des gueltigen Bereichs." }
}
function Assert-FactcheckUrl($Text,[string]$Context) {
    Assert-FactcheckText $Text $Context
    $uri = $null
    if (-not [Uri]::TryCreate($Text,[UriKind]::Absolute,[ref]$uri) -or $uri.Scheme -ne 'https' -or $uri.UserInfo) { throw "$Context muss eine HTTPS-URL ohne Zugangsdaten sein." }
}
function Assert-FactcheckPublicValue($Value) {
    if ($null -eq $Value) { return }
    if ($Value -is [string]) {
        $bad = '(?m)^\s*\[\d{2}:\d{2}:\d{2}\]\s+\S|^\s*WEBVTT\s*$|\d{2}:\d{2}:\d{2},\d{3}\s*-->|^\s*>\s'
        $bad += '|"(events|segs|automatic_captions|requested_formats|streamingData)"\s*:'
        $bad += '|data:(image|audio|video)/|!\[[^\]]*\]\('
        $bad += '|(?i:(?<![A-Z0-9])[A-Z]:[\\/]|file:///|[.][.]?[\\/](media|source)[.])'
        $bad += '|-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}'
        if ($Value -match $bad) { throw 'Factchecktext enthaelt Rohquellen-, Medien-, Privatpfad- oder Geheimnismuster.' }
        return
    }
    if ($Value -is [pscustomobject]) { foreach ($p in $Value.PSObject.Properties) { Assert-FactcheckPublicValue $p.Value }; return }
    if ($Value -is [array]) { foreach ($v in $Value) { Assert-FactcheckPublicValue $v } }
}
function ConvertFrom-FactcheckJson([string]$Text) {
    # Grenze gilt fuer den Inhalt, nicht fuer die Einrueckung (Windows PowerShell 5.1 serialisiert intern sehr breit).
    if ([Text.Encoding]::UTF8.GetByteCount(($Text -replace '(?m)^[ \t]+','')) -gt 2MB) { throw 'Factcheck-JSON ist zu gross.' }
    try { $data = $Text | ConvertFrom-Json -ErrorAction Stop } catch { throw 'Factcheck-JSON ist nicht lesbar.' }
    return $data
}
# Recherchedokumentation bei fehlenden Belegen, siehe docs/AGENTEN_RECHERCHE.md.
# A/B = Nicht ausreichend belegbar, C = Nicht überprüfbar, D = Meinung / Prognose; entschiedene Bewertungen und offene Pruefungen ohne Fall.
$script:FactcheckResearchGaps = @('Quellenlage unzureichend','Recherche ohne ausreichendes Ergebnis','Derzeit nicht überprüfbar','Kein überprüfbarer Tatsachenkern')
$script:FactcheckResearchConfidence = @('Hoch','Mittel','Niedrig')
function Get-FactcheckExpectedGaps($Claim) {
    if ($Claim.status -ceq 'Nicht überprüfbar') { return ,@('Derzeit nicht überprüfbar') }
    if ($Claim.status -cne 'Abgeschlossen') { return ,@($null) }
    if ($Claim.verdict -ceq 'Nicht ausreichend belegbar') { return ,@('Quellenlage unzureichend','Recherche ohne ausreichendes Ergebnis') }
    if ($Claim.verdict -ceq 'Meinung / Prognose') { return ,@('Kein überprüfbarer Tatsachenkern') }
    return ,@($null)
}
function Assert-FactcheckResearch($Claim,$SourceIds) {
    $r = $Claim.research
    Assert-FactcheckKeys $r @('gap','confidence','rounds','missingInformation','conflicts') 'Recherchedokumentation'
    if ($null -ne $r.gap -and $script:FactcheckResearchGaps -cnotcontains $r.gap) { throw 'Recherchefall ungueltig.' }
    $expected = Get-FactcheckExpectedGaps $Claim
    if ($expected -cnotcontains $r.gap) { throw ('Recherchefall passt nicht zu Status/Bewertung; erwartet: ' + (($expected | ForEach-Object { if ($null -eq $_) { 'null' } else { $_ } }) -join ' oder ') + '.') }
    if ($script:FactcheckResearchConfidence -cnotcontains $r.confidence) { throw 'Recherchesicherheit muss Hoch, Mittel oder Niedrig sein.' }
    Assert-FactcheckArray $r.rounds 'Recherchedurchgaenge'
    $documented = @{}
    foreach ($round in $r.rounds) {
        Assert-FactcheckKeys $round @('date','agent','strategy','sourceIds','result') 'Recherchedurchgang'
        if ($round.date -cnotmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Recherchedatum ungueltig.' }
        try { $null = [datetime]::ParseExact($round.date,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture) } catch { throw 'Recherchedatum ungueltig.' }
        foreach ($key in @('agent','strategy','result')) { Assert-FactcheckText $round.$key ('Recherchedurchgang ' + $key) }
        Assert-FactcheckArray $round.sourceIds 'Recherchequellen'
        foreach ($id in $round.sourceIds) {
            if (@($SourceIds.Keys) -cnotcontains $id) { throw 'Recherchedurchgang nennt unbekannte Quelle; nur tatsaechlich gepruefte, verzeichnete Quellen eintragen.' }
            $documented[$id] = $true
        }
    }
    if (@('Quellenlage unzureichend','Recherche ohne ausreichendes Ergebnis') -ccontains $r.gap) {
        if ($r.rounds.Count -lt 2) { throw 'Nicht ausreichend belegbar erst nach mindestens zwei dokumentierten Recherchedurchgaengen.' }
        if ($Claim.openQuestions.Count -eq 0) { throw 'Nicht ausreichend belegbar braucht konkrete naechste Pruefschritte in openQuestions.' }
    }
    if (@('Quellenlage unzureichend','Recherche ohne ausreichendes Ergebnis','Derzeit nicht überprüfbar') -ccontains $r.gap) {
        Assert-FactcheckText $r.missingInformation 'Fehlende Information'
    } elseif ($null -ne $r.missingInformation) { Assert-FactcheckText $r.missingInformation 'Fehlende Information' }
    if ($r.rounds.Count -gt 0) {
        foreach ($ref in $Claim.sourceRefs) { if (-not $documented.ContainsKey($ref.sourceId)) { throw 'Zugeordnete Quelle ohne dokumentierten Recherchedurchgang.' } }
    }
    if ($null -ne $r.conflicts) {
        Assert-FactcheckText $r.conflicts 'Quellenwiderspruch'
        if ($Claim.sourceRefs.Count -lt 2) { throw 'Quellenwiderspruch braucht mindestens zwei zugeordnete Quellen.' }
    }
}
# Nur lesend: Aussagen ohne Wahr/Falsch-Urteil als Kandidaten fuer eine gezielte Nachrecherche (docs/AGENTEN_RECHERCHE.md, Abschnitt 5).
# Entschiedene Bewertungen und Meinungen sind keine Kandidaten. Es wird nichts geaendert.
function Get-FactcheckRecheckCandidates($Data) {
    foreach ($c in $Data.claims) {
        $category = $null
        if ($c.status -ceq 'Offen') { $category = 'Noch nicht geprüft' }
        elseif ($c.status -ceq 'In Bearbeitung') { $category = 'In Bearbeitung' }
        elseif ($c.status -ceq 'Nicht überprüfbar') { $category = 'Nicht überprüfbar' }
        elseif ($c.verdict -ceq 'Nicht ausreichend belegbar') { $category = 'Nicht ausreichend belegbar' }
        if ($null -eq $category) { continue }
        $hasResearch = @($c.PSObject.Properties.Name) -ccontains 'research'
        [pscustomobject][ordered]@{
            claimId = $c.id; category = $category
            documented = [bool]($hasResearch -and $c.research.rounds.Count -gt 0)
            nextStep = @($c.openQuestions)[0]
        }
    }
}
function Assert-FactcheckData($Data) {
    Assert-FactcheckKeys $Data @('schemaVersion','scope','legacyPoints','sources','claims','speakers') 'Datensatz'
    Assert-FactcheckInteger $Data.schemaVersion 2 2 'Schemaversion'
    Assert-FactcheckKeys $Data.scope @('kind','videoId','videoUrl','durationSeconds','asOf','baselineCommit','selectedLegacyIds','totalLegacyPoints','unmigratedLegacyPoints','researchNote','coverageNote') 'Umfang'
    $s = $Data.scope
    if (@('Teilbestand','Vollbestand') -cnotcontains $s.kind -or $s.videoId -cnotmatch '^[A-Za-z0-9_-]{11}$') { throw 'Factcheckumfang/Video-ID ungueltig.' }
    if ($s.videoUrl -cne ('https://www.youtube.com/watch?v=' + $s.videoId)) { throw 'Video-URL passt nicht zur Video-ID.' }
    Assert-FactcheckInteger $s.durationSeconds 1 864000 'Laufzeit'
    if ($s.asOf -cnotmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Stichtag ungueltig.' }
    try { $null = [datetime]::ParseExact($s.asOf,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture) } catch { throw 'Stichtag ungueltig.' }
    if ($null -ne $s.baselineCommit -and $s.baselineCommit -cnotmatch '^[0-9a-f]{40}$') { throw 'Herkunftscommit ungueltig.' }
    Assert-FactcheckText $s.researchNote 'Recherchehinweis'
    Assert-FactcheckText $s.coverageNote 'Abdeckungshinweis'
    Assert-FactcheckArray $s.selectedLegacyIds 'Ausgewaehlte Pruefpunkte'
    Assert-FactcheckArray $Data.legacyPoints 'Herkunftspunkte'
    Assert-FactcheckArray $Data.sources 'Quellen'
    Assert-FactcheckArray $Data.claims 'Aussagen'
    if ($Data.claims.Count -eq 0) { throw 'Leerer Factcheck.' }
    Assert-FactcheckInteger $s.totalLegacyPoints 0 100000 'Alte Gesamtzahl'
    Assert-FactcheckInteger $s.unmigratedLegacyPoints 0 100000 'Nicht migriert'
    if ($s.selectedLegacyIds.Count + $s.unmigratedLegacyPoints -ne $s.totalLegacyPoints) { throw 'Factcheckumfang ist inkonsistent.' }
    if ($s.selectedLegacyIds.Count -gt 0 -and $null -eq $s.baselineCommit) { throw 'Migrierte Pruefpunkte brauchen einen Herkunftscommit.' }
    if ($s.kind -ceq 'Vollbestand' -and $s.unmigratedLegacyPoints -gt 0) { throw 'Unmigrierte Pruefpunkte sind kein Vollbestand.' }
    $legacyIds = @{}; $sourceIds = @{}; $claimIds = @{}; $occurrenceIds = @{}
    foreach ($l in $Data.legacyPoints) {
        Assert-FactcheckKeys $l @('id','chapter','point','path','fileSha256','section','migrationNote') 'Herkunft'
        Assert-FactcheckInteger $l.chapter 1 999 'Altes Kapitel'; Assert-FactcheckInteger $l.point 1 99999 'Alter Pruefpunkt'
        if ($l.id -cne ('C{0:00}-P{1:00}' -f $l.chapter,$l.point) -or $legacyIds.ContainsKey($l.id)) { throw 'Doppelte/ungueltige Herkunfts-ID.' }
        if ($s.selectedLegacyIds -cnotcontains $l.id) { throw 'Nicht ausgewaehlter Herkunftspunkt.' }
        if ($l.path -cnotmatch ('^faktenchecks/' + [regex]::Escape($s.videoId) + '/kapitel/[A-Za-z0-9_-]+\.md$')) { throw 'Herkunftspfad ungueltig.' }
        if ($l.fileSha256 -cnotmatch '^[0-9a-f]{64}$') { throw 'Herkunftshash ungueltig.' }
        Assert-FactcheckText $l.section 'Erhaltener Herkunftstext'; Assert-FactcheckText $l.migrationNote 'Migrationsnotiz'
        $legacyIds[$l.id] = $l
    }
    if ($legacyIds.Count -ne $s.selectedLegacyIds.Count -or @($s.selectedLegacyIds | Select-Object -Unique).Count -ne $s.selectedLegacyIds.Count) { throw 'Herkunftsauswahl ist inkonsistent.' }
    foreach ($src in $Data.sources) {
        Assert-FactcheckKeys $src @('id','title','url','details','accessedOn','accessBasis') 'Quelle'
        if ($src.id -cnotmatch '^S[0-9]{3,}$' -or $sourceIds.ContainsKey($src.id)) { throw 'Doppelte/ungueltige Quellen-ID.' }
        Assert-FactcheckText $src.title 'Quellentitel'; Assert-FactcheckUrl $src.url 'Quellen-URL'
        Assert-FactcheckText $src.details 'Quellenstand'; Assert-FactcheckText $src.accessBasis 'Zugriffsgrundlage'
        if ($src.accessedOn -cnotmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Quellen-Abrufdatum ungueltig.' }
        try { $null = [datetime]::ParseExact($src.accessedOn,'yyyy-MM-dd',[Globalization.CultureInfo]::InvariantCulture) } catch { throw 'Quellen-Abrufdatum ungueltig.' }
        $sourceIds[$src.id] = $src
    }
    Assert-FactcheckArray $Data.speakers 'Sprecherverzeichnis'
    $speakerIds = @{}
    foreach ($sp in $Data.speakers) {
        Assert-FactcheckKeys $sp @('id','name','videoRole','identityBasis') 'Sprecher'
        if ($sp.id -cnotmatch '^SP[0-9]{2,}$' -or $speakerIds.ContainsKey($sp.id)) { throw 'Doppelte/ungueltige Sprecher-ID.' }
        if ($null -ne $sp.name) { Assert-FactcheckText $sp.name 'Sprechername' }
        Assert-FactcheckText $sp.videoRole 'Videorolle'; Assert-FactcheckText $sp.identityBasis 'Identitaetsgrundlage'
        $speakerIds[$sp.id] = $sp
    }
    $normalizedClaims = @{}
    foreach ($c in $Data.claims) {
        $claimKeys = @('id','videoId','chapter','legacyId','kind','description','status','verdict','reason','assessmentBasis','migration','sourceRefs','openQuestions','occurrences','relations')
        # Optionale Recherchedokumentation (docs/AGENTEN_RECHERCHE.md); Bestand ohne das Feld bleibt gueltig.
        if (@($c.PSObject.Properties.Name) -ccontains 'research') { $claimKeys += 'research' }
        Assert-FactcheckKeys $c $claimKeys 'Aussage'
        if ($c.id -cnotmatch ('^' + [regex]::Escape($s.videoId) + '-A[0-9]{4,}$') -or $claimIds.ContainsKey($c.id)) { throw 'Doppelte/ungueltige Aussage-ID.' }
        if ($c.videoId -cne $s.videoId -or ($null -ne $c.legacyId -and $s.selectedLegacyIds -cnotcontains $c.legacyId)) { throw 'Aussage hat falsche Video-/Herkunftszuordnung.' }
        Assert-FactcheckInteger $c.chapter 1 999 'Kapitel'
        if ($null -ne $c.legacyId -and $c.chapter -ne $legacyIds[$c.legacyId].chapter) { throw 'Kapitelzuordnung passt nicht zur Herkunft.' }
        if ($script:FactcheckKinds -cnotcontains $c.kind -or $script:FactcheckStatuses -cnotcontains $c.status) { throw 'Aussageart/Status ungueltig.' }
        if ($c.status -ceq 'Abgeschlossen') {
            if ($script:FactcheckVerdicts -cnotcontains $c.verdict) { throw 'Abgeschlossene Aussage ohne gueltige Bewertung.' }
            if (($c.kind -ceq 'Tatsachenbehauptung') -eq ($c.verdict -ceq 'Meinung / Prognose')) { throw 'Bewertung passt nicht zur Aussageart.' }
        } elseif ($null -ne $c.verdict) { throw 'Offene/laufende Aussage darf keine Endbewertung erhalten.' }
        if ($c.status -ceq 'Nicht überprüfbar') {
            if ($c.kind -cne 'Tatsachenbehauptung') { throw 'Nur Tatsachenbehauptungen koennen nicht ueberpruefbar sein.' }
            if (-not ([string]$c.reason).StartsWith($script:FactcheckUnverifiablePrefix)) { throw 'Nicht ueberpruefbare Aussage braucht Begruendung mit Nicht überprüfbar – Grund.' }
        } elseif (([string]$c.reason) -cmatch '^Nicht überprüf') { throw 'Begruendung Nicht ueberpruefbar/ueberprueft nur mit Status Nicht überprüfbar; noch nicht gepruefte Aussagen bleiben Offen.' }
        foreach ($key in @('description','reason','assessmentBasis')) { Assert-FactcheckText $c.$key $key }
        Assert-FactcheckKeys $c.migration @('changeType','mapping','assessmentChange') 'Migrationszuordnung'
        foreach ($key in @('changeType','mapping','assessmentChange')) { Assert-FactcheckText $c.migration.$key $key }
        foreach ($key in @('sourceRefs','openQuestions','occurrences','relations')) { Assert-FactcheckArray $c.$key $key }
        if ($c.occurrences.Count -eq 0) { throw 'Aussage ohne Fundstelle.' }
        if ($c.status -ceq 'Abgeschlossen' -and $c.sourceRefs.Count -eq 0 -and $c.kind -ceq 'Tatsachenbehauptung') { throw 'Abgeschlossene Tatsache ohne Sachquelle.' }
        if ($c.status -cne 'Abgeschlossen' -and $c.openQuestions.Count -eq 0) { throw 'Offene Aussage ohne offene Frage.' }
        foreach ($q in $c.openQuestions) { Assert-FactcheckText $q 'Offene Frage' }
        $seenRefs = @{}
        foreach ($ref in $c.sourceRefs) {
            Assert-FactcheckKeys $ref @('sourceId','note') 'Belegzuordnung'
            if (@($sourceIds.Keys) -cnotcontains $ref.sourceId -or $seenRefs.ContainsKey($ref.sourceId)) { throw 'Quellenverweis fehlt/ist doppelt.' }
            Assert-FactcheckText $ref.note 'Beleggrenze'; $seenRefs[$ref.sourceId] = $true
        }
        if ($claimKeys -ccontains 'research') { Assert-FactcheckResearch $c $sourceIds }
        $fingerprint = [regex]::Replace($c.description.ToLowerInvariant(),'\s+',' ').Trim()
        if ($normalizedClaims.ContainsKey($fingerprint)) { throw 'Identische Aussage doppelt erfasst; Vorkommen zusammenfuehren.' }
        $normalizedClaims[$fingerprint] = $true
        $seenOccurrences = @{}
        foreach ($o in $c.occurrences) {
            Assert-FactcheckKeys $o @('id','startSeconds','endSeconds','precision','speakerId','candidateSpeakerId','attributionStatus','attributionBasis','legacySpeaker','role','roleStatus','roleBasis','note','timeBasis','timeHistory') 'Vorkommen'
            if ($o.id -cnotmatch ('^' + [regex]::Escape($s.videoId) + '-O[0-9]{4,}$') -or $occurrenceIds.ContainsKey($o.id)) { throw 'Doppelte/ungueltige Vorkommens-ID.' }
            Assert-FactcheckInteger $o.startSeconds 0 ($s.durationSeconds-1) 'Start'
            Assert-FactcheckInteger $o.endSeconds 1 $s.durationSeconds 'Ende'
            if ($o.endSeconds -le $o.startSeconds) { throw 'Zeitbereich endet vor seinem Anfang.' }
            if (@('Ungefähr','Kontrolliert') -cnotcontains $o.precision -or @('Behauptung','Ausdrückliche Zustimmung','Rückfrage','Fremdbezug','Zurückweisung','Selbstkorrektur') -cnotcontains $o.role) { throw 'Praezision/Vorkommensrolle ungueltig.' }
            foreach ($field in @('speakerId','candidateSpeakerId')) {
                if ($null -ne $o.$field -and @($speakerIds.Keys) -cnotcontains $o.$field) { throw 'Unbekannte Sprecher-ID am Vorkommen.' }
            }
            if (@('Bestätigt','Plausibel','Ungeklärt') -cnotcontains $o.attributionStatus -or @('Bestätigt','Plausibel','Ungeklärt') -cnotcontains $o.roleStatus) { throw 'Zuordnungsstatus ungueltig.' }
            if ($o.attributionStatus -ceq 'Bestätigt') {
                if ($null -eq $o.speakerId -or $null -ne $o.candidateSpeakerId) { throw 'Bestaetigte Zuordnung braucht genau eine Sprecher-ID und keinen Kandidaten.' }
            } elseif ($o.attributionStatus -ceq 'Plausibel') {
                if ($null -ne $o.speakerId -or $null -eq $o.candidateSpeakerId) { throw 'Plausible Zuordnung braucht einen Kandidaten, keinen bestaetigten Sprecher.' }
            } elseif ($null -ne $o.speakerId -or $null -ne $o.candidateSpeakerId) { throw 'Ungeklaerte Zuordnung darf keine Person festlegen.' }
            foreach ($field in @('attributionBasis','roleBasis')) { Assert-FactcheckText $o.$field $field }
            if ($null -ne $o.legacySpeaker) { Assert-FactcheckText $o.legacySpeaker 'Alte Sprecherangabe' }
            Assert-FactcheckText $o.timeBasis 'Zeitgrundlage'
            Assert-FactcheckArray $o.timeHistory 'Zeithistorie'
            foreach ($h in $o.timeHistory) {
                Assert-FactcheckKeys $h @('startSeconds','endSeconds','precision','basis') 'Fruehere Fundstelle'
                Assert-FactcheckInteger $h.startSeconds 0 ($s.durationSeconds-1) 'Historischer Start'
                Assert-FactcheckInteger $h.endSeconds 1 $s.durationSeconds 'Historisches Ende'
                if ($h.endSeconds -le $h.startSeconds -or @('Ungefähr','Kontrolliert') -cnotcontains $h.precision) { throw 'Historischer Zeitbereich ungueltig.' }
                Assert-FactcheckText $h.basis 'Historische Zeitgrundlage'
            }
            Assert-FactcheckText $o.note 'Fundstellenhinweis'
            $fp = "$($o.startSeconds)|$($o.endSeconds)|$($o.speakerId)|$($o.candidateSpeakerId)|$($o.role)"
            if ($seenOccurrences.ContainsKey($fp)) { throw 'Dasselbe Vorkommen doppelt erfasst.' }
            $seenOccurrences[$fp] = $true; $occurrenceIds[$o.id] = $true
        }
        $claimIds[$c.id] = $c
    }
    foreach ($c in $Data.claims) {
        foreach ($r in $c.relations) {
            Assert-FactcheckKeys $r @('type','claimId','note') 'Aussagebeziehung'
            if (@('korrigiert','widerspricht') -cnotcontains $r.type -or -not $claimIds.ContainsKey($r.claimId) -or $r.claimId -ceq $c.id) { throw 'Ungueltige Korrektur-/Gegenargumentbeziehung.' }
            Assert-FactcheckText $r.note 'Beziehungshinweis'
        }
    }
    foreach ($c in $Data.claims) {
        foreach ($o in @($c.occurrences | Where-Object role -CEQ 'Selbstkorrektur')) {
            $targets = @($c.relations | Where-Object type -CEQ 'korrigiert')
            if ($targets.Count -eq 0) { throw 'Selbstkorrektur braucht eine korrigiert-Beziehung zur frueheren Aussage.' }
            if ($o.attributionStatus -ceq 'Bestätigt' -and $o.roleStatus -ceq 'Bestätigt') {
                $prior = @($targets | ForEach-Object { $claimIds[$_.claimId].occurrences } | Where-Object {
                    $_.speakerId -ceq $o.speakerId -and $_.attributionStatus -ceq 'Bestätigt' -and $_.roleStatus -ceq 'Bestätigt' -and
                    (Test-FactcheckOwnRole $_) -and $_.startSeconds -lt $o.startSeconds
                })
                if ($prior.Count -eq 0) { throw 'Bestaetigte Selbstkorrektur braucht fruehere bestaetigte eigene Aussage derselben Person.' }
            }
        }
    }
    foreach ($id in $s.selectedLegacyIds) { if (@($Data.claims | Where-Object legacyId -CEQ $id).Count -eq 0) { throw 'Herkunftspunkt ohne migrierte Aussage.' } }
    Assert-FactcheckPublicValue $Data
}
# Die Gesamtzaehlung behaelt plausible eigene Bezuege bei, weist ihre Unsicherheit aus.
# Personen werden strenger gefiltert: Identitaetszuordnung UND Aussagebezug bestaetigt.
function Test-FactcheckOwnRole($Occurrence) {
    return (@('Behauptung','Ausdrückliche Zustimmung','Selbstkorrektur') -ccontains $Occurrence.role -and $Occurrence.roleStatus -cne 'Ungeklärt')
}
function Test-FactcheckPersonOccurrence($Occurrence,[string]$SpeakerId) {
    return ((Test-FactcheckOwnRole $Occurrence) -and $Occurrence.roleStatus -ceq 'Bestätigt' -and $Occurrence.attributionStatus -ceq 'Bestätigt' -and $Occurrence.speakerId -ceq $SpeakerId)
}
function Get-FactcheckPersonStatistics($Data) {
    $persons = @()
    foreach ($sp in $Data.speakers) {
        $facts = @($Data.claims | Where-Object {
            $_.kind -ceq 'Tatsachenbehauptung' -and @($_.occurrences | Where-Object { Test-FactcheckPersonOccurrence $_ $sp.id }).Count -gt 0
        })
        $done = @($facts | Where-Object status -CEQ 'Abgeschlossen')
        $categories = @()
        foreach ($v in $script:FactcheckVerdicts) {
            $n = @($done | Where-Object verdict -CEQ $v).Count
            $percent = $null
            if ($done.Count -gt 0 -and $v -cne 'Meinung / Prognose') { $percent = [math]::Round(100.0*$n/$done.Count,1) }
            $categories += [pscustomobject][ordered]@{category=$v;completedCount=$n;completedFactPercent=$percent}
        }
        $persons += [pscustomobject][ordered]@{
            speakerId=$sp.id;name=$sp.name;uniqueFacts=$facts.Count;completedFacts=$done.Count
            openFacts=@($facts | Where-Object status -CEQ 'Offen').Count
            inProgressFacts=@($facts | Where-Object status -CEQ 'In Bearbeitung').Count
            unverifiableFacts=@($facts | Where-Object status -CEQ 'Nicht überprüfbar').Count
            percentageDenominator=$done.Count;categories=$categories
        }
    }
    $eligible = @($Data.claims | Where-Object {
        $_.kind -ceq 'Tatsachenbehauptung' -and @($_.occurrences | Where-Object { Test-FactcheckOwnRole $_ }).Count -gt 0
    })
    $assigned = @($eligible | Where-Object { @($_.occurrences | Where-Object {
        $_.attributionStatus -ceq 'Bestätigt' -and $_.roleStatus -ceq 'Bestätigt' -and (Test-FactcheckOwnRole $_)
    }).Count -gt 0 })
    $allOccurrences = @($Data.claims | ForEach-Object { $_.occurrences })
    $attributionCounts = [ordered]@{}; $roleCounts = [ordered]@{}
    foreach ($st in @('Bestätigt','Plausibel','Ungeklärt')) {
        $attributionCounts[$st] = @($allOccurrences | Where-Object attributionStatus -CEQ $st).Count
        $roleCounts[$st] = @($allOccurrences | Where-Object roleStatus -CEQ $st).Count
    }
    return [pscustomobject][ordered]@{
        definition='Nur eigenstaendige Tatsachen mit bestaetigter Personenzuordnung und bestaetigtem eigenem Aussagebezug. Je Person und Aussage hoechstens einmal. Gemeinsame Zustimmung kann mehreren Personen zugerechnet werden; Personensummen sind nicht additiv. Keine Glaubwuerdigkeitsnote.'
        persons=$persons;eligibleFacts=$eligible.Count;reliablyAssignedFacts=$assigned.Count
        factsWithoutReliablePerson=($eligible.Count-$assigned.Count)
        factsWithUncertainAttribution=@($eligible | Where-Object { @($_.occurrences | Where-Object { (Test-FactcheckOwnRole $_) -and $_.attributionStatus -cne 'Bestätigt' }).Count -gt 0 }).Count
        factsWithUncertainOwnRole=@($Data.claims | Where-Object {
            $_.kind -ceq 'Tatsachenbehauptung' -and @($_.occurrences | Where-Object { @('Behauptung','Ausdrückliche Zustimmung','Selbstkorrektur') -ccontains $_.role -and $_.roleStatus -cne 'Bestätigt' }).Count -gt 0
        }).Count
        occurrenceAttributionCounts=[pscustomobject]$attributionCounts
        occurrenceRoleStatusCounts=[pscustomobject]$roleCounts
    }
}
function Get-FactcheckStatistics($Data) {
    Assert-FactcheckData $Data
    $eligible = @($Data.claims | Where-Object { @($_.occurrences | Where-Object { Test-FactcheckOwnRole $_ }).Count -gt 0 })
    $facts = @($eligible | Where-Object kind -CEQ 'Tatsachenbehauptung')
    $doneFacts = @($facts | Where-Object status -CEQ 'Abgeschlossen')
    $statuses = [ordered]@{}; foreach ($st in $script:FactcheckStatuses) { $statuses[$st] = @($eligible | Where-Object status -CEQ $st).Count }
    $kinds = [ordered]@{}; foreach ($k in $script:FactcheckKinds) { $kinds[$k] = @($eligible | Where-Object kind -CEQ $k).Count }
    $categories = @()
    foreach ($v in $script:FactcheckVerdicts) {
        $percent = $null
        $count = @($eligible | Where-Object { $_.status -ceq 'Abgeschlossen' -and $_.verdict -ceq $v }).Count
        if ($v -cne 'Meinung / Prognose' -and $doneFacts.Count -gt 0) {
            $percent = [math]::Round(100.0 * @($doneFacts | Where-Object verdict -CEQ $v).Count / $doneFacts.Count,1)
        }
        $categories += [pscustomobject][ordered]@{category=$v;completedCount=$count;completedFactPercent=$percent}
    }
    $assertions = 0; $additional = 0; $sameSpeakerRepeats = 0; $references = 0; $unresolved = 0
    foreach ($c in $Data.claims) {
        $n = @($c.occurrences | Where-Object { Test-FactcheckOwnRole $_ }).Count
        $assertions += $n; $additional += [math]::Max(0,$n-1)
        foreach ($sp in $Data.speakers) {
            $personOccurrences = @($c.occurrences | Where-Object { Test-FactcheckPersonOccurrence $_ $sp.id }).Count
            $sameSpeakerRepeats += [math]::Max(0,$personOccurrences-1)
        }
        $references += @($c.occurrences | Where-Object { @('Behauptung','Ausdrückliche Zustimmung','Selbstkorrektur') -cnotcontains $_.role }).Count
        $unresolved += @($c.occurrences | Where-Object { @('Behauptung','Ausdrückliche Zustimmung','Selbstkorrektur') -ccontains $_.role -and $_.roleStatus -ceq 'Ungeklärt' }).Count
    }
    $referenceOnly = @($Data.claims | Where-Object { @($_.occurrences | Where-Object {
        @('Behauptung','Ausdrückliche Zustimmung','Selbstkorrektur') -ccontains $_.role
    }).Count -eq 0 }).Count
    return [pscustomobject][ordered]@{
        schemaVersion=2;scope=$Data.scope.kind;coverageNote=$Data.scope.coverageNote;videoId=$Data.scope.videoId
        selectedLegacyPoints=$Data.legacyPoints.Count;totalLegacyPoints=$Data.scope.totalLegacyPoints
        statementRecords=$Data.claims.Count;uniqueStatements=$eligible.Count;referenceOnlyStatements=$referenceOnly;unresolvedRoleOnlyStatements=($Data.claims.Count-$eligible.Count-$referenceOnly)
        assertionOccurrences=$assertions;additionalAssertionOccurrences=$additional;sameSpeakerRepeatedAssertionOccurrences=$sameSpeakerRepeats;referenceOccurrences=$references;unresolvedRoleOccurrences=$unresolved
        statusCounts=[pscustomobject]$statuses;kindCounts=[pscustomobject]$kinds
        completedFacts=$doneFacts.Count;openFacts=@($facts | Where-Object status -CEQ 'Offen').Count
        inProgressFacts=@($facts | Where-Object status -CEQ 'In Bearbeitung').Count
        unverifiableFacts=@($facts | Where-Object status -CEQ 'Nicht überprüfbar').Count
        percentageDenominator=$doneFacts.Count
        percentageDenominatorDefinition='Einmalig gezaehlte abgeschlossene Tatsachenbehauptungen mit mindestens einem eigenen Behauptungs-, Zustimmungs- oder Selbstkorrekturvorkommen (Bezug bestaetigt oder plausibel). Sprecheridentitaet unabhaengig davon; Unsicherheit separat ausgewiesen. Meinungen, Prognosen, offene/laufende, nicht ueberpruefbare und nur erwaehnte Aussagen ausgeschlossen; abgeschlossen nicht ausreichend belegbar eingeschlossen.'
        categories=$categories
        speakerStatistics=(Get-FactcheckPersonStatistics $Data)
    }
}
function Format-FactcheckTime([int]$Seconds) {
    return '{0:00}:{1:00}:{2:00}' -f [math]::Floor($Seconds/3600),[math]::Floor(($Seconds%3600)/60),($Seconds%60)
}
function Normalize-FactcheckText([string]$Text) {
    return $Text.Replace(([string][char]13+[char]10),[string][char]10).TrimEnd() + [char]10
}
function ConvertTo-FactcheckJson($Object) { return Normalize-FactcheckText ($Object | ConvertTo-Json -Depth 40) }
function Test-FactcheckEqual($Left,$Right) {
    if ($null -eq $Left -or $null -eq $Right) { return ($null -eq $Left -and $null -eq $Right) }
    if ($Left -is [pscustomobject] -or $Right -is [pscustomobject]) {
        if ($Left -isnot [pscustomobject] -or $Right -isnot [pscustomobject]) { return $false }
        $a=@($Left.PSObject.Properties.Name); $b=@($Right.PSObject.Properties.Name)
        if ($a.Count -ne $b.Count) { return $false }
        foreach ($key in $a) { if ($b -cnotcontains $key -or -not (Test-FactcheckEqual $Left.$key $Right.$key)) { return $false } }
        return $true
    }
    if ($Left -is [array] -or $Right -is [array]) {
        if ($Left -isnot [array] -or $Right -isnot [array] -or $Left.Count -ne $Right.Count) { return $false }
        for ($i=0;$i -lt $Left.Count;$i++) { if (-not (Test-FactcheckEqual $Left[$i] $Right[$i])) { return $false } }
        return $true
    }
    if ($Left -is [string] -or $Right -is [string]) { return ($Left -is [string] -and $Right -is [string] -and $Left -ceq $Right) }
    if ($Left -is [bool] -or $Right -is [bool]) { return ($Left -is [bool] -and $Right -is [bool] -and $Left -eq $Right) }
    return ($Left -eq $Right)
}
function Test-FactcheckArtifactEqual([string]$Name,[string]$Actual,[string]$Expected,[switch]$AllowLegacySourceLabel) {
    if ($Name -ceq 'statistik.json') {
        return Test-FactcheckEqual (ConvertFrom-FactcheckJson $Actual) (ConvertFrom-FactcheckJson $Expected)
    }
    # Nur fuer einen separat geprueften Index mit dem frueheren Renderer.
    # Arbeitsbaum und Build -Check bleiben strikt auf der aktuellen Beschriftung.
    if ($AllowLegacySourceLabel -and $Name -clike 'berichte/*.md') {
        $Actual = (Normalize-FactcheckText $Actual).Replace(([string][char]10 + '  Abruf des Erststands: '),([string][char]10 + '  Quellenzugriff am '))
    }
    return ((Normalize-FactcheckText $Actual) -ceq (Normalize-FactcheckText $Expected))
}
function Get-FactcheckTextHash([string]$Text) {
    $hash = [Security.Cryptography.SHA256]::Create()
    try { return (($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes((Normalize-FactcheckText $Text))) | ForEach-Object { $_.ToString('x2') }) -join '') } finally { $hash.Dispose() }
}

function Get-FactcheckArtifacts($Data) {
    $stats = Get-FactcheckStatistics $Data
    $lf = [string][char]10
    $artifacts = [ordered]@{}
    $artifacts['statistik.json'] = ConvertTo-FactcheckJson $stats
    $lines = [Collections.Generic.List[string]]::new()
    $lines.Add('# Strukturierte Faktenchecks')
    $lines.Add('')
    $lines.Add('Automatisch aus aussagen.json erzeugt. Nicht separat bearbeiten.')
    $lines.Add('')
    $lines.Add('**Abdeckung: ' + $Data.scope.kind + '.** ' + $Data.scope.coverageNote)
    $lines.Add('')
    $lines.Add('Stand: ' + $Data.scope.asOf + ' · Video: ' + $Data.scope.videoId)
    $lines.Add('')
    $lines.Add($Data.scope.researchNote)
    $lines.Add('')
    $lines.Add('## Umfang und Bearbeitungsstand')
    $lines.Add('')
    $lines.Add('- Ausgewaehlte bisherige Pruefpunkte: ' + $stats.selectedLegacyPoints + ' von ' + $stats.totalLegacyPoints)
    $lines.Add('- Uebrige bisherige Pruefpunkte bleiben unveraendert: ' + $Data.scope.unmigratedLegacyPoints)
    $lines.Add('- Eigenstaendige Aussagen mit mindestens einer eigenen Behauptung: ' + $stats.uniqueStatements)
    $lines.Add('- Abgeschlossen: ' + $stats.statusCounts.Abgeschlossen)
    $lines.Add('- Offen (noch nicht geprueft): ' + $stats.statusCounts.Offen)
    $lines.Add('- In Bearbeitung: ' + $stats.statusCounts.'In Bearbeitung')
    $lines.Add('- Nicht ueberpruefbar (abschliessend ohne Urteil): ' + $stats.statusCounts.'Nicht überprüfbar')
    $lines.Add('- Erfasste Behauptungsvorkommen: ' + $stats.assertionOccurrences)
    $lines.Add('- Zusaetzliche eigene Aussagevorkommen nach dem ersten je Aussage: ' + $stats.additionalAssertionOccurrences)
    $lines.Add('- Davon bestaetigte Wiederholungen derselben Person: ' + $stats.sameSpeakerRepeatedAssertionOccurrences)
    $lines.Add('- Rueckfragen/Fremdbezuege/Zurueckweisungen: ' + $stats.referenceOccurrences)
    $lines.Add('- Vorkommen mit ungeklaertem eigenem Aussagebezug: ' + $stats.unresolvedRoleOccurrences)
    $lines.Add('- Aussagen ausschliesslich mit ungeklaertem eigenem Bezug: ' + $stats.unresolvedRoleOnlyStatements)
    $lines.Add('- Nur referenzierte Aussagen ohne eigene Behauptung: ' + $stats.referenceOnlyStatements)
    $lines.Add('- Meinungen: ' + $stats.kindCounts.Meinung + '; Prognosen: ' + $stats.kindCounts.Prognose)
    $lines.Add('')
    $lines.Add('Zusaetzliche Vorkommen umfassen auch ausdrueckliche Zustimmung anderer Personen. Nur erneut derselben Person mit bestaetigter Zuordnung und bestaetigtem eigenem Bezug zugerechnete Vorkommen zaehlen als bestaetigte Personenwiederholung. Null bedeutet nur: im dokumentierten Datenbestand keine solchen Faelle erfasst.')
    $lines.Add('')
    $lines.Add('## Bewertungen und Prozentnenner')
    $lines.Add('')
    $lines.Add('Nenner der folgenden Tatsachenprozente: ' + $stats.percentageDenominator + ' abgeschlossene eigenstaendige Tatsachenpruefungen.')
    $lines.Add('')
    $lines.Add($stats.percentageDenominatorDefinition)
    $lines.Add('')
    $lines.Add('| Bewertung | Abgeschlossene Aussagen | Anteil am Tatsachen-Nenner |')
    $lines.Add('| --- | ---: | ---: |')
    foreach ($row in $stats.categories) {
        $percentage = 'nicht anwendbar'
        if ($null -ne $row.completedFactPercent) { $percentage = $row.completedFactPercent.ToString('0.0',[Globalization.CultureInfo]::InvariantCulture) + ' %' }
        $lines.Add('| ' + $row.category + ' | ' + $row.completedCount + ' | ' + $percentage + ' |')
    }
    $lines.Add('')
    $lines.Add('Keine Endbewertung fuer offene, laufende und nicht ueberpruefbare Aussagen. Bei Nenner null sind Tatsachenprozente nicht anwendbar. Rundungsdifferenzen sind moeglich. Keine Gesamtnote und keine Hochrechnung auf das Video.')
    $lines.Add('')
    $lines.Add('## Sprecherverzeichnis und Zuordnungsstand')
    $lines.Add('')
    foreach ($sp in $Data.speakers) {
        $name = $sp.name; if ($null -eq $name) { $name = 'Name ungeklaert' }
        $lines.Add('- ' + $sp.id + ': ' + $name + ' (' + $sp.videoRole + '). ' + $sp.identityBasis)
    }
    $ps = $stats.speakerStatistics
    $lines.Add('')
    $lines.Add($ps.definition)
    $lines.Add('')
    $lines.Add('Regulaer einer Person zugeordnete Tatsachen: ' + $ps.reliablyAssignedFacts + ' von ' + $ps.eligibleFacts + '. Ohne verlaessliche Personenzuordnung: ' + $ps.factsWithoutReliablePerson + '.')
    $lines.Add('')
    $lines.Add('Tatsachen mit unsicherer Sprecherzuordnung: ' + $ps.factsWithUncertainAttribution + '; mit unsicherem eigenem Aussagebezug: ' + $ps.factsWithUncertainOwnRole + '. Diese Mengen koennen sich ueberschneiden.')
    $lines.Add('')
    foreach ($st in @('Bestätigt','Plausibel','Ungeklärt')) {
        $lines.Add('- ' + $st + ': Sprecherzuordnung ' + $ps.occurrenceAttributionCounts.$st + ', Aussagebezug ' + $ps.occurrenceRoleStatusCounts.$st + ' Vorkommen.')
    }
    $lines.Add('')
    $lines.Add('| Person | Zugeordnete Tatsachen | Abgeschlossen | Offen | In Bearbeitung | Nicht ueberpruefbar | Prozentnenner |')
    $lines.Add('| --- | ---: | ---: | ---: | ---: | ---: | ---: |')
    foreach ($person in $ps.persons) {
        $name = $person.name; if ($null -eq $name) { $name = $person.speakerId }
        $lines.Add('| ' + $name + ' | ' + $person.uniqueFacts + ' | ' + $person.completedFacts + ' | ' + $person.openFacts + ' | ' + $person.inProgressFacts + ' | ' + $person.unverifiableFacts + ' | ' + $person.percentageDenominator + ' |')
    }
    $lines.Add('')
    $lines.Add('Null zugeordnete Tatsachen bedeutet keine bestaetigte Zurechnung in dieser Auswahl, nicht keine getaetigten Aussagen. Kategorieverteilungen stehen in statistik.json; bei Nenner null sind alle Tatsachenprozente null. Die Gesamtstatistik behaelt plausible eigene Bezuege bei und bestaetigt damit keine Sprecheridentitaet. Ungeklaerte eigene Bezuege gehen nicht in ihre Hauptzaehlung ein.')
    $lines.Add('')
    $lines.Add('## Kapitelberichte')
    $lines.Add('')
    foreach ($chapter in @($Data.claims.chapter | Sort-Object -Unique)) {
        $file = 'kapitel-{0:00}.md' -f $chapter
        $lines.Add('- [Kapitel ' + $chapter + '](berichte/' + $file + ')')
    }
    $lines.Add('- [Vorher/Nachher und vollstaendige eigene Alttexte](migration.md)')
    $lines.Add('- [Zentrale JSON-Daten](aussagen.json) · [Maschinenlesbare Statistik](statistik.json)')
    $artifacts['README.md'] = Normalize-FactcheckText ($lines -join $lf)

    $migration = [Collections.Generic.List[string]]::new()
    $migration.Add('# Herkunft und Migration der strukturierten Aussagen')
    $migration.Add('')
    $migration.Add('Automatisch aus aussagen.json erzeugt. Die nachstehenden Alttexte sind unsere bereits veroeffentlichten Projekttexte, keine Originalrede oder Transkripte.')
    $migration.Add('')
    $migration.Add('Abdeckung: ' + $Data.scope.coverageNote)
    $migration.Add('')
    if ($null -ne $Data.scope.baselineCommit) { $migration.Add('Herkunftscommit: ' + $Data.scope.baselineCommit) }
    if ($Data.legacyPoints.Count -eq 0) { $migration.Add('Keine Altpunkte migriert; dieser Datenbestand erfasst Aussagen direkt.') }
    foreach ($l in $Data.legacyPoints) {
        $migration.Add(''); $migration.Add('## ' + $l.id)
        $migration.Add(''); $migration.Add('[Unveraenderter bisheriger Kapitelbericht](../../../' + $l.path + ')')
        $migration.Add(''); $migration.Add('Referenzhash der Kapiteldatei: ' + $l.fileSha256)
        $migration.Add(''); $migration.Add($l.migrationNote)
        $migration.Add(''); $migration.Add('### Bisherige Darstellung, unveraenderter eigener Text')
        $migration.Add(''); $migration.Add($l.section)
        $migration.Add(''); $migration.Add('### Neue Einzelaussagen')
        $migration.Add(''); $migration.Add('| ID | Status | Einzelbewertung | Redaktionelle Zuordnung |')
        $migration.Add('| --- | --- | --- | --- |')
        foreach ($c in @($Data.claims | Where-Object legacyId -CEQ $l.id)) {
            $v = 'keine Endbewertung'; if ($null -ne $c.verdict) { $v = $c.verdict }
            $migration.Add('| ' + $c.id + ' | ' + $c.status + ' | ' + $v + ' | ' + $c.migration.mapping.Replace('|','/') + ' |')
        }
        foreach ($c in @($Data.claims | Where-Object legacyId -CEQ $l.id)) {
            $migration.Add('')
            $migration.Add('Bewertungsuebergang ' + $c.id + ': ' + $c.migration.assessmentChange)
            $migration.Add('')
        }
    }
    $artifacts['migration.md'] = Normalize-FactcheckText ($migration -join $lf)

    foreach ($chapter in @($Data.claims.chapter | Sort-Object -Unique)) {
        $report = [Collections.Generic.List[string]]::new()
        $report.Add(('# Kapitel {0:00}: strukturierte Faktenprüfung' -f $chapter))
        $report.Add(''); $report.Add('Automatisch aus aussagen.json erzeugt. Abdeckung: ' + $Data.scope.kind + '. ' + $Data.scope.coverageNote)
        $report.Add(''); $report.Add($Data.scope.researchNote)
        # Bei mehreren Altpunkten macht die Einleitung auch anderweitig gefuehrte Wiederholungen sichtbar.
        $origins = @($Data.legacyPoints | Where-Object chapter -EQ $chapter)
        if ($origins.Count -gt 1) {
            $report.Add(''); $report.Add('## Übertragene Herkunftspunkte und Zuordnung')
            foreach ($origin in $origins) {
                $report.Add(''); $report.Add('### ' + $origin.id)
                $report.Add(''); $report.Add($origin.migrationNote)
            }
            $report.Add(''); $report.Add('Die folgenden Detailprüfungen stehen im führenden Kapitel ihrer Aussage. Wiederholungen bereits anderswo erfasster Aussagen bleiben dort als zusätzliche Vorkommen erhalten und werden oben im Herkunftspunkt benannt. Keine zusätzliche Aussage allein wegen eines neuen Kapitels.')
        }
        foreach ($c in @($Data.claims | Where-Object chapter -EQ $chapter)) {
            $report.Add(''); $report.Add('## ' + $c.id)
            if ($null -ne $c.legacyId) {
                $l = @($Data.legacyPoints | Where-Object id -CEQ $c.legacyId)[0]
                $report.Add(''); $report.Add('Herkunft: [bisheriger Kapitelbericht](../../../../' + $l.path + '), Pruefpunkt ' + $l.point + ' (' + $l.id + ').')
            } else { $report.Add(''); $report.Add('Direkte strukturierte Neuerfassung ohne migrierten Altpruefpunkt.') }
            $report.Add(''); $report.Add('**Eigene Beschreibung:** ' + $c.description)
            $v = 'keine Endbewertung'; if ($null -ne $c.verdict) { $v = $c.verdict }
            $report.Add(''); $report.Add('Status: **' + $c.status + '** · Bewertung: **' + $v + '** · Art: ' + $c.kind)
            $report.Add(''); $report.Add('### Fundstellen und Zuordnung')
            foreach ($o in $c.occurrences) {
                $speaker = 'nicht bestaetigt'
                if ($null -ne $o.speakerId) {
                    $sp = @($Data.speakers | Where-Object id -CEQ $o.speakerId)[0]
                    $speaker = $sp.name; if ($null -eq $speaker) { $speaker = $sp.id }
                } elseif ($null -ne $o.candidateSpeakerId) {
                    $sp = @($Data.speakers | Where-Object id -CEQ $o.candidateSpeakerId)[0]
                    $name = $sp.name; if ($null -eq $name) { $name = $sp.id }
                    $speaker += '; Kandidat: ' + $name
                }
                $report.Add('')
                $report.Add('- [' + (Format-FactcheckTime $o.startSeconds) + '–' + (Format-FactcheckTime $o.endSeconds) + '](' + $Data.scope.videoUrl + '&t=' + $o.startSeconds + 's) · ' + $speaker + ' · ' + $o.role + ' · ' + $o.precision)
                $report.Add('  Zeitpraezision: ' + $o.precision + '. Sprecherzuordnung: **' + $o.attributionStatus + '**. Aussagebezug: **' + $o.roleStatus + '**.')
                $report.Add(''); $report.Add('Grundlage der Sprecherzuordnung: ' + $o.attributionBasis)
                $report.Add(''); $report.Add('Grundlage des Aussagebezugs: ' + $o.roleBasis)
                if ($null -ne $o.legacySpeaker) { $report.Add(''); $report.Add('Erhaltene Altzuordnung: ' + $o.legacySpeaker + '. Kein eigenstaendiger Identitaetsnachweis.') }
                $included = $false
                if ($null -ne $o.speakerId) { $included = Test-FactcheckPersonOccurrence $o $o.speakerId }
                $personNote = 'ausgeschlossen: Person oder eigener Aussagebezug nicht bestaetigt, oder nur referierender Bezug.'
                if ($included -and $c.kind -ceq 'Tatsachenbehauptung') { $personNote = 'beruecksichtigt, je Person und Aussage hoechstens einmal.' }
                $report.Add(''); $report.Add('Personenstatistik: ' + $personNote)
                $report.Add(''); $report.Add('Fundstellenhinweis: ' + $o.note)
                $report.Add(''); $report.Add('Zeitgrundlage: ' + $o.timeBasis)
                foreach ($h in $o.timeHistory) {
                    $report.Add(''); $report.Add('Frueherer Suchbereich: [' + (Format-FactcheckTime $h.startSeconds) + '–' + (Format-FactcheckTime $h.endSeconds) + '](' + $Data.scope.videoUrl + '&t=' + $h.startSeconds + 's), ' + $h.precision + '. ' + $h.basis)
                }
            }
            $report.Add(''); $report.Add('### Eigene Begruendung und Migrationsentscheidung')
            $report.Add(''); $report.Add($c.reason)
            $report.Add(''); $report.Add('Grundlage der Bewertung: ' + $c.assessmentBasis)
            $report.Add(''); $report.Add('Uebernahme: ' + $c.migration.mapping)
            $report.Add(''); $report.Add('Bewertungsuebergang: ' + $c.migration.assessmentChange)
            $report.Add(''); $report.Add('### Zugeordnete Quellen')
            if ($c.sourceRefs.Count -eq 0) { $report.Add(''); $report.Add('Keine unabhaengig gepruefte Sachquelle zugeordnet; die Videofundstelle ist kein Wahrheitsbeleg.') }
            foreach ($ref in $c.sourceRefs) {
                $src = @($Data.sources | Where-Object id -CEQ $ref.sourceId)[0]
                $report.Add(''); $report.Add('- [' + $src.title + '](' + $src.url + ') · ' + $src.details)
                $report.Add('  Quellenzugriff am ' + $src.accessedOn + '. ' + $src.accessBasis + ' ' + $ref.note)
            }
            $report.Add(''); $report.Add('### Offene Fragen und Unsicherheiten')
            if ($c.openQuestions.Count -eq 0) { $report.Add(''); $report.Add('Keine weitere offene Sachfrage eingetragen. Recherche- und Zuordnungsgrenzen stehen in den jeweiligen Grundlagen; das ersetzt keine unabhaengige Nachpruefung.') }
            foreach ($q in $c.openQuestions) { $report.Add(''); $report.Add('- ' + $q) }
            if (@($c.PSObject.Properties.Name) -ccontains 'research') {
                $r = $c.research
                $report.Add(''); $report.Add('### Recherchedokumentation')
                $gapText = 'kein offener Fall'; if ($null -ne $r.gap) { $gapText = $r.gap }
                $report.Add(''); $report.Add('Einordnung: ' + $gapText + '. Sicherheit der Einordnung: ' + $r.confidence + '.')
                if ($null -ne $r.missingInformation) { $report.Add(''); $report.Add('Fehlende Information: ' + $r.missingInformation) }
                if ($null -ne $r.conflicts) { $report.Add(''); $report.Add('Widersprueche zwischen Quellen: ' + $r.conflicts) }
                $n = 0
                foreach ($round in $r.rounds) {
                    $n++
                    $ids = 'keine geeignete Quelle'; if ($round.sourceIds.Count -gt 0) { $ids = ($round.sourceIds -join ', ') }
                    $report.Add(''); $report.Add('- Durchgang ' + $n + ' am ' + $round.date + ' (' + $round.agent + '): ' + $round.strategy + ' Gepruefte Quellen: ' + $ids + '. Ergebnis: ' + $round.result)
                }
            }
            if ($c.relations.Count -gt 0) {
                $report.Add(''); $report.Add('### Beziehungen')
                foreach ($r in $c.relations) { $report.Add(''); $report.Add('- ' + $r.type + ' ' + $r.claimId + ': ' + $r.note) }
            }
        }
        $report.Add(''); $report.Add('[Uebersicht und Statistik](../README.md) · [Migrationsvergleich](../migration.md)')
        $artifacts[('berichte/kapitel-{0:00}.md' -f $chapter)] = Normalize-FactcheckText ($report -join $lf)
    }
    return ,$artifacts
}
function Assert-FactcheckCollection($Texts,[switch]$AllowLegacySourceLabel) {
    $dataPaths = @($Texts.Keys | Where-Object { $_ -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/strukturiert/aussagen\.json$' })
    $videoDirs = @($Texts.Keys | Where-Object { $_ -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/strukturiert/' } | ForEach-Object { ($_ -split '/')[1] } | Select-Object -Unique)
    foreach ($video in $videoDirs) { if ($dataPaths -cnotcontains ('faktenchecks/' + $video + '/strukturiert/aussagen.json')) { throw 'Factcheckartefakte ohne zentrale Daten.' } }
    foreach ($path in $dataPaths) {
        $d = ConvertFrom-FactcheckJson $Texts[$path]
        Assert-FactcheckData $d
        $prefix = 'faktenchecks/' + $d.scope.videoId + '/strukturiert/'
        if ($path -cne ($prefix + 'aussagen.json')) { throw 'Factcheckpfad passt nicht zur Video-ID.' }
        foreach ($l in $d.legacyPoints) {
            if (-not $Texts.ContainsKey($l.path)) { throw ('Herkunftsdatei fehlt: ' + $l.path) }
            if ((Get-FactcheckTextHash $Texts[$l.path]) -cne $l.fileSha256) { throw ('Herkunftsdatei wurde veraendert: ' + $l.path) }
            $pattern = '(?ms)^## Prüfpunkt ' + $l.point + '\r?\n(.*?)(?=^## (?:Prüfpunkt \d+|Kapitel-Fazit)|\z)'
            $section = [regex]::Match($Texts[$l.path],$pattern).Value.Trim()
            if ($section.Replace(([string][char]13+[char]10),[string][char]10) -cne $l.section.Replace(([string][char]13+[char]10),[string][char]10)) { throw 'Migrierter Alttext wurde veraendert/gekuerzt.' }
        }
        $expected = Get-FactcheckArtifacts $d
        foreach ($name in $expected.Keys) {
            $target = $prefix + $name
            if (-not $Texts.ContainsKey($target) -or -not (Test-FactcheckArtifactEqual $name $Texts[$target] $expected[$name] -AllowLegacySourceLabel:$AllowLegacySourceLabel)) { throw ('Veraltetes/fehlendes Factcheckartefakt: ' + $target) }
        }
        foreach ($actual in @($Texts.Keys | Where-Object { $_.StartsWith($prefix,[StringComparison]::Ordinal) })) {
            $tail = $actual.Substring($prefix.Length)
            if ($tail -cne 'aussagen.json' -and -not $expected.Contains($tail)) { throw ('Unbekanntes Factcheckartefakt: ' + $actual) }
        }
    }
}
