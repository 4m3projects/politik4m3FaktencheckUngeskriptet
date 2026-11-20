[CmdletBinding()]
param([string]$VideoId = 'mlxFA9T88I0',[switch]$Check)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'Factcheck-Common.ps1')
if ($VideoId -cnotmatch '^[A-Za-z0-9_-]{11}$') { throw 'Ungueltige Video-ID.' }
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dir = Join-Path $root ('faktenchecks/' + $VideoId + '/strukturiert')
$utf = [Text.UTF8Encoding]::new($false,$true)
$d = ConvertFrom-FactcheckJson ([IO.File]::ReadAllText((Join-Path $dir 'aussagen.json'),$utf))
if ($d.scope.videoId -cne $VideoId) { throw 'Video-ID und Daten passen nicht zusammen.' }
Assert-FactcheckShortReasonComplete $d
$artifacts = Get-FactcheckArtifacts $d
foreach ($name in $artifacts.Keys) {
    $path = Join-Path $dir $name
    if ($Check) {
        if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or
            -not (Test-FactcheckArtifactEqual $name ([IO.File]::ReadAllText($path,$utf)) $artifacts[$name])) {
            throw ('Factcheckartefakt fehlt oder ist veraltet: ' + $name)
        }
    } else {
        $parent = Split-Path -Parent $path
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        [IO.File]::WriteAllText($path,$artifacts[$name],$utf)
    }
}
if ($Check) { Write-Host 'OK: Factcheckartefakte stimmen mit JSON ueberein; keine Dateien geschrieben.' }
else { Write-Host ('Erzeugt: ' + $artifacts.Count + ' Factcheckartefakte aus aussagen.json.') }
