[CmdletBinding()]
param(
    [Parameter(Mandatory)][string]$Url,
    [string]$Sprachen = 'de.*,en.*',
    [string]$PrivateRoot,
    [string]$YtDlpPath,
    [string]$DenoPath
)
$ErrorActionPreference = 'Stop'
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..')).TrimEnd('\','/')
$parentRoot = Split-Path -Parent $repoRoot
$uri = $null
if (-not [Uri]::TryCreate($Url, [UriKind]::Absolute, [ref]$uri) -or
    $uri.Scheme -ne 'https' -or
    $uri.Host -notmatch '^(www\.|m\.|music\.)?(youtube\.com|youtu\.be)$') {
    throw 'Eine einzelne HTTPS-YouTube-Video-URL angeben.'
}
$id = if ($uri.Host -match '(^|\.)youtu\.be$') { $uri.AbsolutePath.Trim('/').Split('/')[0] }
      elseif ($uri.AbsolutePath -eq '/watch') { [regex]::Match($uri.Query, '(?:\?|&)v=([^&]+)').Groups[1].Value }
      elseif ($uri.AbsolutePath -match '^/(shorts|live|embed)/([A-Za-z0-9_-]{11})/?$') { $Matches[2] }
      else { '' }
if ($id -notmatch '^[A-Za-z0-9_-]{11}$') { throw 'Keine einzelne Video-ID erkannt; keine Kanaele oder Playlists.' }
$canonicalUrl = 'https://www.youtube.com/watch?v=' + $id

if (-not $PrivateRoot) { $PrivateRoot = Join-Path $parentRoot '.politik4m3-private' }
$privatePath = [IO.Path]::GetFullPath($PrivateRoot).TrimEnd('\','/')
if ($privatePath.Equals($repoRoot, [StringComparison]::OrdinalIgnoreCase) -or
    $privatePath.StartsWith($repoRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Private Quellen muessen ausserhalb des Git-Arbeitsbaums liegen.'
}
# Keine Verzeichnis-Junctions/Symlinks als Umweg in den Arbeitsbaum zulassen.
$cursor = $privatePath
while ($cursor) {
    if (Test-Path -LiteralPath $cursor) {
        $item = Get-Item -LiteralPath $cursor -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw 'Private Ablage darf nicht durch eine Verzeichnisverknuepfung fuehren.'
        }
    }
    $next = Split-Path -Parent $cursor
    if ($next -eq $cursor) { break }
    $cursor = $next
}

if (-not $YtDlpPath) {
    $existing = Join-Path $parentRoot 'youtubedownload\.tools\yt-dlp.exe'
    if (Test-Path -LiteralPath $existing -PathType Leaf) { $YtDlpPath = $existing }
    else {
        $command = Get-Command yt-dlp -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($command) { $YtDlpPath = $command.Source }
    }
}
if (-not $YtDlpPath -or -not (Test-Path -LiteralPath $YtDlpPath -PathType Leaf)) {
    throw 'yt-dlp fehlt. Extern bereitstellen und -YtDlpPath angeben; keine Binaries im Repository ablegen.'
}
if (-not $DenoPath) {
    $candidate = Join-Path (Split-Path -Parent $YtDlpPath) 'deno.exe'
    if (Test-Path -LiteralPath $candidate -PathType Leaf) { $DenoPath = $candidate }
}
if ($DenoPath -and -not (Test-Path -LiteralPath $DenoPath -PathType Leaf)) { throw 'DenoPath existiert nicht.' }

New-Item -ItemType Directory -Path $privatePath -Force | Out-Null
$targetDir = Join-Path $privatePath $id
if (Test-Path -LiteralPath $targetDir) {
    $targetItem = Get-Item -LiteralPath $targetDir -Force
    if (($targetItem.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { throw 'Videoziel ist eine Verzeichnisverknuepfung.' }
}
$common = @('--ignore-config','--no-playlist','--skip-download','--no-overwrites','--no-post-overwrites',
    '--windows-filenames','--paths',$privatePath,'--output','%(id)s/source.%(ext)s',
    '--write-info-json','--write-description','--newline','--retries','2')
if ($DenoPath) { $common += @('--js-runtimes',('deno:' + $DenoPath)) }
& $YtDlpPath @common '--' $canonicalUrl
if ($LASTEXITCODE -ne 0) { throw 'Metadatenabruf fehlgeschlagen. Keine Auswertung anhand des Titels erfinden.' }
# YouTube Shorts (docs/SHORTS.md): yt-dlp meldet Shorts mit normaler watch-Adresse. Erkennung daher an der
# eingegebenen /shorts/-Adresse oder an Hochformat plus hoechstens drei Minuten Laufzeit.
$infoPath = Join-Path $targetDir 'source.info.json'
if (Test-Path -LiteralPath $infoPath -PathType Leaf) {
    $info = Get-Content -LiteralPath $infoPath -Raw -Encoding UTF8 | ConvertFrom-Json
    $vertical = $info.width -and $info.height -and ([double]$info.height -gt [double]$info.width)
    $shortLength = $info.duration -and ([double]$info.duration -le 180)
    if ($uri.AbsolutePath -match '^/shorts/' -or ($vertical -and $shortLength)) {
        Write-Host ('YouTube Short erkannt (Laufzeit ' + $info.duration + ' s, ' + $info.width + 'x' + $info.height + '): in video.json "format": "short" setzen; videoUrl bleibt ' + $canonicalUrl + '.')
    }
}
& $YtDlpPath @common '--write-subs' '--write-auto-subs' '--sleep-subtitles' '5' '--sub-langs' $Sprachen '--sub-format' 'json3' '--' $canonicalUrl
$subtitleFailure = $LASTEXITCODE -ne 0
$count = 0
foreach ($sub in Get-ChildItem -LiteralPath $targetDir -Filter 'source.*.json3' -File) {
    $json = Get-Content -LiteralPath $sub.FullName -Raw -Encoding UTF8 | ConvertFrom-Json
    $timed = [Collections.Generic.List[string]]::new()
    $previous = ''
    foreach ($event in $json.events) {
        if (-not $event.segs) { continue }
        $line = [Net.WebUtility]::HtmlDecode((($event.segs.utf8 -join '') -replace '\s+',' ').Trim())
        if (-not $line -or $line -eq $previous) { continue }
        $previous = $line
        $time = [TimeSpan]::FromMilliseconds([double]$event.tStartMs)
        $stamp = '{0:00}:{1:00}:{2:00}' -f [math]::Floor($time.TotalHours),$time.Minutes,$time.Seconds
        $timed.Add('[' + $stamp + '] ' + $line)
    }
    if ($timed.Count -eq 0) { continue }
    $txt = Join-Path $targetDir ($sub.BaseName + '.zeitstempel.txt')
    if (-not (Test-Path -LiteralPath $txt)) {
        [IO.File]::WriteAllLines($txt,$timed,[Text.UTF8Encoding]::new($false))
    }
    $count++
}
Write-Host ('Private Ablage: ' + $targetDir)
Write-Host ('Untertitelfassungen mit Inhalt: ' + $count)
Write-Host 'Keine Video-, Audio- oder Bilddateien angefordert. Keine Quelldateien in das Repository kopieren.'
if ($subtitleFailure) { Write-Warning 'Untertitelabruf hatte Teilfehler. Vorhandene Sprachen getrennt pruefen; fehlende Abschnitte/Sprachen offen ausweisen.' }
if ($count -eq 0) { throw 'Keine nutzbaren Untertitel vorhanden. Keine Inhaltsanalyse erfinden.' }
