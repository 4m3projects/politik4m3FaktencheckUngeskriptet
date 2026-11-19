[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$AudioPath,
    [ValidatePattern('^[A-Za-z0-9_-]{11}$')][string]$VideoId,
    [ValidatePattern('^[a-z]{2,3}$')][string]$Language = 'de',
    [ValidateNotNullOrEmpty()][string]$Model = 'small',
    [string]$WhisperPath
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\','/')
$audio = Get-Item -LiteralPath $AudioPath
if ($audio.PSIsContainer -or $audio.PSProvider.Name -ne 'FileSystem') {
    throw 'Eine lokale Audiodatei angeben.'
}
if ($audio.FullName.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Die Audiodatei muss ausserhalb des Git-Arbeitsbaums liegen.'
}
if ($WhisperPath) {
    $WhisperPath = (Get-Item -LiteralPath $WhisperPath).FullName
}
else {
    $whisperCommand = Get-Command whisper -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if (-not $whisperCommand) { throw 'Die lokale OpenAI-Whisper-CLI fehlt. Siehe docs/AGENTEN_TRANSKRIPTION.md.' }
    $WhisperPath = $whisperCommand.Source
}
if (-not (Get-Command ffmpeg -CommandType Application -ErrorAction SilentlyContinue)) {
    throw 'FFmpeg fehlt im PATH. Whisper benoetigt FFmpeg zum Lesen der Audiodatei.'
}

$privateRoot = Join-Path (Split-Path -Parent $repoRoot) '.politik4m3-private'
$group = if ($VideoId) { $VideoId } else { 'lokale-audioquellen' }
$outputParent = Join-Path (Join-Path $privateRoot $group) 'whisper'
# Vor dem Anlegen auch vorhandene Vorfahren pruefen, damit keine Junction ins Projekt fuehrt.
for ($dir = $outputParent; $dir; $dir = Split-Path -Parent $dir) {
    if ((Test-Path -LiteralPath $dir) -and
        ((Get-Item -LiteralPath $dir -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) {
        throw 'Die private Ablage darf nicht durch eine Verzeichnisverknuepfung fuehren.'
    }
}
$runName = [guid]::NewGuid().ToString('N')
$output = Join-Path $outputParent $runName
New-Item -ItemType Directory -Path $output -ErrorAction Stop | Out-Null
$subtitlePath = Join-Path $output ($audio.BaseName + '.srt')

Write-Warning 'Automatische Arbeitstranskription. Wortlaut, Zeitmarken und Sprecher am Original abgleichen.'
& $WhisperPath $audio.FullName '--task' 'transcribe' '--language' $Language '--model' $Model '--output_dir' $output '--output_format' 'srt' '--verbose' 'False'
if ($LASTEXITCODE -ne 0) { throw "Whisper fehlgeschlagen (Exitcode $LASTEXITCODE). Private Arbeitsablage: $output" }
if (-not (Test-Path -LiteralPath $subtitlePath -PathType Leaf) -or (Get-Item -LiteralPath $subtitlePath).Length -eq 0) {
    throw 'Whisper hat keine Untertitel mit Inhalt erzeugt.'
}
Write-Output $subtitlePath
