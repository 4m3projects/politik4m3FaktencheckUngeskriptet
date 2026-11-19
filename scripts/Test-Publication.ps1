[CmdletBinding()]
param([string]$Root)
$ErrorActionPreference = 'Stop'
if (-not $Root) { $Root = Join-Path $PSScriptRoot '..' }
$repoRoot = (Resolve-Path -LiteralPath $Root).Path.TrimEnd('\','/')
$problems = [Collections.Generic.List[string]]::new()
$utf = [Text.UTF8Encoding]::new($false,$true)
$checkedCount = 0
$workTexts = @{}
$indexTexts = @{}
. (Join-Path $PSScriptRoot 'Factcheck-Common.ps1')
function Test-PublicFile([string]$RelativePath,[string]$Content,[string]$Origin) {
    $name = $RelativePath.Replace('\','/')
    # site/: statische Webseite aus eigenem Code ohne Fremdbibliotheken; .github/workflows/: deren Deployment.
    $allowed = $name -match '^(README\.md|AGENTS\.md|CLAUDE\.md|LICENSE|\.gitignore|\.gitattributes)$' -or
        $name -match '^(docs|faktenchecks)/[A-Za-z0-9_./-]+\.md$' -or
        $name -match '^scripts/[A-Za-z0-9_-]+\.(ps1|js)$' -or
        $name -match '^site/[A-Za-z0-9_-]+\.(html|css|js)$' -or
        # Favicon der Webseite: SVG plus PNG/ICO-Fallback (einzige zugelassene Binaerdateien).
        $name -cmatch '^site/(favicon\.(svg|ico)|apple-touch-icon\.png)$' -or
        $name -match '^\.github/workflows/[A-Za-z0-9_-]+\.yml$' -or
        # Vorlage für Korrekturvorgänge (docs/AGENTEN_WISSEN.md).
        $name -cmatch '^\.github/ISSUE_TEMPLATE/[a-z0-9-]+\.md$' -or
        $name -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/strukturiert/(aussagen|statistik)\.json$' -or
        $name -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/video\.json$' -or
        $name -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/rhetorik\.json$' -or
        $name -cmatch '^faktenchecks/[A-Za-z0-9_-]{11}/themen\.json$' -or
        # Themen-Wissensdatenbank (docs/WISSENSDATENBANK.md): Konfiguration, Themen, Einträge, Korrekturvorgänge.
        $name -cmatch '^wissen/(konfiguration|themen)\.json$' -or
        $name -cmatch '^wissen/eintraege/[A-Z][A-Z0-9]{1,5}-K[0-9]{4,}\.json$' -or
        $name -cmatch '^wissen/korrekturen/[A-Z][A-Z0-9]{1,5}-C[0-9]{4,}\.json$' -or
        $name -ceq 'faktenchecks/beziehungen.json'
    if (-not $allowed -or $name -match '(^|/)\.\.(/|$)') {
        $problems.Add($Origin + ': nicht zugelassener Pfad ' + $name)
        return
    }
    if (($name -like 'faktenchecks/*') -and $name -match '(^|/)(media|source)[.]|transcript|transkript|subtitle|untertitel|cookies|credentials|(^|/)\.env') {
        $problems.Add($Origin + ': verdaechtiger Dateiname ' + $name)
    }
    if ($name -like 'faktenchecks/*' -or $name -like 'wissen/*') {
        $patterns = @{
            'typische Transkriptzeile' = '(?m)^\s*\[\d{2}:\d{2}:\d{2}\]\s+\S'
            'SRT-Zeitcode' = '\d{2}:\d{2}:\d{2},\d{3}\s*-->'
            'WebVTT-Rohtext' = '(?m)^WEBVTT\s*$'
            'Untertitel-/YouTube-Rohdaten' = '"(events|segs|automatic_captions|requested_formats|streamingData)"\s*:'
            'eingebettete Bild-/Mediendaten' = 'data:(image|audio|video)/|!\[[^\]]*\]\('
            'Markdown-Blockzitat' = '(?m)^\s*>\s'
            'private lokale Quelle' = '(?i)((?<![A-Z0-9])[A-Z]:[\\/]|file:///|[.][.]?[\\/](media|source)[.])'
        }
        foreach ($key in $patterns.Keys) {
            if ($Content -match $patterns[$key]) { $problems.Add($Origin + ': ' + $key + ' in ' + $name) }
        }
    }
    if ($Content -match '-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}') {
        $problems.Add($Origin + ': moegliches Zugangsdatenmaterial in ' + $name)
    }
}
# Auch ignorierte/ungetrackte Dateien pruefen, .git selbst ist kein Publikationsinhalt.
$stack = [Collections.Generic.Stack[string]]::new()
$stack.Push($repoRoot)
while ($stack.Count -gt 0) {
    foreach ($item in Get-ChildItem -LiteralPath $stack.Pop() -Force) {
        if ($item.Name -eq '.git' -and (Split-Path -Parent $item.FullName) -eq $repoRoot) { continue }
        $rel = $item.FullName.Substring($repoRoot.Length + 1)
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            $problems.Add('Arbeitsbaum: Verknuepfung nicht erlaubt ' + $rel)
            continue
        }
        if ($item.PSIsContainer) { $stack.Push($item.FullName); continue }
        if ($item.Length -gt 2MB) {
            $problems.Add('Arbeitsbaum: zu grosse Datei fuer diese Textsammlung ' + $rel)
            continue
        }
        if ($rel.Replace('\','/') -cmatch '^site/(favicon\.ico|apple-touch-icon\.png)$') {
            # Binaere Favicons: nur Dateityp ueber Signatur und Groesse pruefen, kein UTF-8-Text.
            $head = [IO.File]::ReadAllBytes($item.FullName)
            $isIco = $rel.EndsWith('.ico') -and $head.Length -ge 4 -and $head[0] -eq 0 -and $head[1] -eq 0 -and $head[2] -eq 1 -and $head[3] -eq 0
            $isPng = $rel.EndsWith('.png') -and $head.Length -ge 8 -and $head[0] -eq 0x89 -and $head[1] -eq 0x50 -and $head[2] -eq 0x4E -and $head[3] -eq 0x47
            if ((-not ($isIco -or $isPng)) -or $item.Length -gt 64KB) { $problems.Add('Arbeitsbaum: ungueltige Favicon-Datei ' + $rel) }
            $checkedCount++
            continue
        }
        try { $body = $utf.GetString([IO.File]::ReadAllBytes($item.FullName)) }
        catch { $problems.Add('Arbeitsbaum: kein valider UTF-8-Text ' + $rel); continue }
        Test-PublicFile $rel $body 'Arbeitsbaum'
        $workTexts[$rel.Replace('\','/')] = $body
        $checkedCount++
    }
}
# Bereits vorgemerkte Inhalte getrennt lesen: der Index kann vom Arbeitsbaum abweichen.
$gitArgs = @('-c',('safe.directory=' + $repoRoot.Replace('\','/')),'-C',$repoRoot)
$indexed = @(& git @gitArgs -c core.quotePath=false ls-files --stage)
if ($LASTEXITCODE -ne 0) { throw 'Git-Index konnte nicht geprueft werden.' }
foreach ($entry in $indexed) {
    if ($entry -notmatch '^(\d+)\s+[0-9a-f]+\s+(\d+)\t(.+)$') {
        $problems.Add('Index: nicht lesbarer Eintrag')
        continue
    }
    $mode = $Matches[1]; $stage = $Matches[2]; $path = $Matches[3]
    if ($mode -ne '100644' -or $stage -ne '0') {
        $problems.Add('Index: unerlaubter Dateimodus oder Konflikt ' + $path)
        continue
    }
    $stored = & git @gitArgs show (':' + $path)
    if ($LASTEXITCODE -ne 0) { throw ('Indexdatei nicht lesbar: ' + $path) }
    Test-PublicFile $path ($stored -join [Environment]::NewLine) 'Index'
    $indexTexts[$path] = ($stored -join [Environment]::NewLine)
}
try { Assert-FactcheckCollection $workTexts } catch { $problems.Add('Arbeitsbaum-Strukturdaten: ' + $_.Exception.Message) }
# Der unveraenderte Index kann noch den Renderer mit der alten Quellenbeschriftung enthalten.
# Nur dann darf exakt diese Beschriftung abweichen; alle Daten und anderen Inhalte bleiben strikt.
$legacyIndexSourceLabel = $indexTexts.ContainsKey('scripts/Factcheck-Common.ps1') -and
    $indexTexts['scripts/Factcheck-Common.ps1'].Contains("`$report.Add('  Abruf des Erststands: '")
try { Assert-FactcheckCollection $indexTexts -AllowLegacySourceLabel:$legacyIndexSourceLabel } catch { $problems.Add('Index-Strukturdaten: ' + $_.Exception.Message) }
if ($problems.Count -gt 0) {
    $problems | ForEach-Object { Write-Host ('FEHLER: ' + $_) }
    throw ('Publikationspruefung fehlgeschlagen: ' + $problems.Count + ' Befunde.')
}
Write-Host ('OK: ' + $checkedCount + ' Dateien im Arbeitsbaum sowie Git-Index geprueft.')
Write-Host 'Technischer Dateifilter bestanden. Inhaltliche Rechte- und Quellenpruefung bleibt erforderlich.'
