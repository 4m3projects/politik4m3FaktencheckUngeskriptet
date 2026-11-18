[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$folder = Join-Path $root 'docs/arbeitsstaende/reaktionen/alfred-luening'
$text = Get-Content -LiteralPath (Join-Path $folder 'pruefdaten.md') -Raw -Encoding UTF8
$blocks = [regex]::Matches($text, '(?s)```json\s*\r?\n(.*?)\r?\n```')
if ($blocks.Count -ne 1) { throw 'Genau ein JSON-Austauschblock erforderlich.' }
$data = ConvertFrom-Json $blocks[0].Groups[1].Value -Depth 30
function Require([bool]$Condition, [string]$Message) {
    if (-not $Condition) { throw $Message }
}
Require ($data.format -ceq 'codex-reaction-review-workspace-v1') 'Unbekanntes Austauschformat.'
Require ($data.video.id -ceq 'sLMyP0H7tSY' -and $data.originalVideoId -ceq 'mlxFA9T88I0') 'Falsche Videozuordnung.'
Require ($data.video.role -ceq 'reaction') 'Reaktion darf nicht als Original auftreten.'
Require ($data.video.durationSeconds -eq 999) 'Laufzeit passt nicht zur erfassten Metadatenbasis.'
Require ($data.coverage.status -ceq 'teilpruefung') 'Ungepruefte Gesamtfreigabe.'
Require ($data.coverage.directAudiovisualReview -ceq $false -and $data.coverage.editorialSecondReview -ceq $false -and $data.coverage.readyForPublication -ceq $false) 'Dieser Arbeitsstand darf keine abgeschlossene Sichtung oder Freigabe behaupten.'
Require ($data.coverage.firstCaptionStartSeconds -eq 0 -and $data.coverage.lastCaptionStartSeconds -eq 985) 'Untertitelabdeckung wurde veraendert; Recherchebasis pruefen.'

$gitArgs = @('-c', ('safe.directory=' + $root.Replace('\','/')), '-C', $root)
$baselineLines = @(& git @gitArgs show ($data.baselineCommit + ':faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json'))
if ($LASTEXITCODE -ne 0) { throw 'Dokumentierter Vergleichscommit fehlt.' }
$baseline = ConvertFrom-Json ($baselineLines -join "`n") -Depth 30
$current = Get-Content -LiteralPath (Join-Path $root 'faktenchecks/mlxFA9T88I0/strukturiert/aussagen.json') -Raw -Encoding UTF8 | ConvertFrom-Json -Depth 30
$baselineIds = @($baseline.claims.id)
$currentIds = @($current.claims.id)
$sourceIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
foreach ($source in $data.sources) {
    Require ($sourceIds.Add($source.id)) ('Doppelte Quelle: ' + $source.id)
    Require ($source.access -cin @('gelesen','metadaten','untertitel','blockiert')) ('Unbekannter Quellenzugang: ' + $source.id)
    Require (-not [string]::IsNullOrWhiteSpace($source.basis)) ('Quellengrenzen fehlen: ' + $source.id)
    Require ($source.accessedOn -ceq $data.asOf) ('Abweichender Abrufstand: ' + $source.id)
    $uri = $null
    Require ([uri]::TryCreate($source.url, [UriKind]::Absolute, [ref]$uri)) ('Keine absolute Quellen-URL: ' + $source.id)
    Require ($uri.Scheme -ceq 'https') ('Keine HTTPS-Quelle: ' + $source.id)
}
$claimIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
$relationCount = 0
foreach ($claim in $data.claims) {
    Require ($claim.id -cmatch '^sLMyP0H7tSY-A\d{4}$' -and $claimIds.Add($claim.id)) ('Ungueltige/doppelte Aussage-ID: ' + $claim.id)
    Require ($claim.videoId -ceq $data.video.id -and $claim.speaker -ceq 'Alfred') ('Originaleinspielung als eigene Sprecherzuordnung erfassen: ' + $claim.id)
    Require ($claim.status -ceq 'vorlaeufig' -and $claim.attributionStatus -ceq 'textlich_plausibel') ('Nicht belegte Endbewertung/Sprecherbestaetigung: ' + $claim.id)
    Require ($claim.verdict -cin @('belegt','teilweise','irrefuehrend','widerlegt','unbelegbar','meinung','offen')) ('Unbekanntes Urteil: ' + $claim.id)
    Require (-not [string]::IsNullOrWhiteSpace($claim.description) -and -not [string]::IsNullOrWhiteSpace($claim.reason)) ('Aussage/Begruendung fehlt: ' + $claim.id)
    $range = $claim.occurrence
    Require ($range.startSeconds -is [long] -or $range.startSeconds -is [int]) ('Keine ganzzahlige Startzeit: ' + $claim.id)
    Require ($range.endSeconds -is [long] -or $range.endSeconds -is [int]) ('Keine ganzzahlige Endzeit: ' + $claim.id)
    Require ($range.startSeconds -ge 0 -and $range.endSeconds -gt $range.startSeconds -and $range.endSeconds -le $data.video.durationSeconds) ('Zeit ausserhalb Video: ' + $claim.id)
    Require ($range.precision -ceq 'ungefaehr') ('Unbelegte Zeitpraezision: ' + $claim.id)
    Require (@($claim.sourceRefs).Count -gt 0) ('Quellenbezug fehlt: ' + $claim.id)
    $readSources = 0
    foreach ($sourceId in $claim.sourceRefs) {
        Require ($sourceIds.Contains($sourceId)) ('Fehlende Quelle ' + $sourceId + ' in ' + $claim.id)
        $source = $data.sources | Where-Object id -CEQ $sourceId
        if ($source.access -ceq 'gelesen') { $readSources++ }
    }
    if ($claim.verdict -ceq 'belegt') {
        Require ($readSources -gt 0) ('Belegt nur mit ungelesenem Material: ' + $claim.id)
    }
    foreach ($reference in $claim.originalRefs) {
        Require ($baselineIds -ccontains $reference.claimId) ('Original-ID fehlt im Vergleichscommit: ' + $reference.claimId)
        Require ($currentIds -ccontains $reference.claimId) ('Original-ID im aktuellen Stand verschwunden: ' + $reference.claimId)
        Require ($reference.relation -ceq 'same_topic') ('Produktionsrelation im vorlaeufigen Format: ' + $claim.id)
        Require (-not [string]::IsNullOrWhiteSpace($reference.verification)) ('Zuordnungsgrenze fehlt: ' + $claim.id)
        $relationCount++
    }
}
foreach ($file in Get-ChildItem -LiteralPath $folder -File) {
    $body = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
    Require ($body -notmatch '(?m)^\s*\[\d{1,2}:\d{2}(:\d{2})?\]\s+\S|(?m)^WEBVTT\s*$|data:(image|video|audio)/') ('Moegliche Rohquelle: ' + $file.Name)
    foreach ($link in [regex]::Matches($body, '\[[^\]]*\]\(([^)]+)\)')) {
        $target = $link.Groups[1].Value
        if ($target -match '^[a-z]+:|^#') { continue }
        $path = Join-Path $file.DirectoryName ($target -split '#')[0]
        Require (Test-Path -LiteralPath $path) ('Lokaler Link fehlt: ' + $target)
    }
}
Write-Host ('PASS: {0} Pruefeintraege, {1} Quellen, {2} Originalverweise; ID-, Zeit-, Link- und Statuskontrolle.' -f $claimIds.Count, $sourceIds.Count, $relationCount)
Write-Host 'Diese technische Kontrolle bestaetigt keine inhaltliche Wahrheit oder abgeschlossene Videoanalyse.'
