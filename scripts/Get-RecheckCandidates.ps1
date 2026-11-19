# Listet je Video die Aussagen ohne Wahr/Falsch-Urteil, die fuer eine gezielte Nachrecherche nach
# docs/AGENTEN_RECHERCHE.md in Frage kommen. Nur lesend: keine Datei wird geschrieben oder geaendert.
# Die Liste ist ein Vorschlag; eine Neubewertung bestehender Videos erfolgt erst nach Freigabe durch den Nutzer.
[CmdletBinding()]
param([string]$VideoId,[switch]$Detail)
$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'Factcheck-Common.ps1')
$files = @(Get-ChildItem -LiteralPath (Join-Path $root 'faktenchecks') -Directory | ForEach-Object { Join-Path $_.FullName 'strukturiert/aussagen.json' } | Where-Object { Test-Path -LiteralPath $_ })
foreach ($file in $files) {
    $data = ConvertFrom-FactcheckJson (Get-Content -LiteralPath $file -Raw -Encoding UTF8)
    if ($VideoId -and $data.scope.videoId -cne $VideoId) { continue }
    Assert-FactcheckData $data
    $list = @(Get-FactcheckRecheckCandidates $data)
    $groups = $list | Group-Object category | ForEach-Object { $_.Name + ': ' + $_.Count }
    $undocumented = @($list | Where-Object { -not $_.documented }).Count
    Write-Host ($data.scope.videoId + ' – ' + $list.Count + ' Kandidaten (' + ($groups -join ', ') + '); ohne Recherchedokumentation: ' + $undocumented)
    if ($Detail) { foreach ($k in $list) { Write-Host ('  ' + $k.claimId + ' · ' + $k.category + ' · dokumentiert: ' + $k.documented + ' · ' + $k.nextStep) } }
}
