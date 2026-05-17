param(
    [string]$BaseDir = (Join-Path $PSScriptRoot "pipeline_workspace"),
    [switch]$Loop,
    [int]$IntervalSeconds = 300
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Ensure-Directories {
    param([string]$Root)

    $paths = @{
        incoming  = Join-Path $Root "incoming"
        review    = Join-Path $Root "review"
        processed = Join-Path $Root "processed"
        failed    = Join-Path $Root "failed"
        state     = Join-Path $Root "state"
    }

    foreach ($path in $paths.Values) {
        if (-not (Test-Path -LiteralPath $path)) {
            New-Item -ItemType Directory -Path $path | Out-Null
        }
    }

    return $paths
}

function Get-FileSha256 {
    param([string]$Path)
    return (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Load-State {
    param([string]$StatePath)

    if (-not (Test-Path -LiteralPath $StatePath)) {
        return @{ files = @{} }
    }

    try {
        $json = Get-Content -LiteralPath $StatePath -Raw -Encoding UTF8 | ConvertFrom-Json -AsHashtable
        if ($null -eq $json -or -not $json.ContainsKey("files")) {
            return @{ files = @{} }
        }
        return $json
    } catch {
        return @{ files = @{} }
    }
}

function Save-State {
    param(
        [string]$StatePath,
        [hashtable]$State
    )
    $State | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

function Linkify {
    param([string]$Text)
    $escaped = [System.Net.WebUtility]::HtmlEncode($Text)
    return [System.Text.RegularExpressions.Regex]::Replace(
        $escaped,
        "(https?://[^\s<>`"]+)",
        '<a href="$1">$1</a>'
    )
}

function Get-DocxParagraphs {
    param([string]$DocxPath)

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [System.IO.Compression.ZipFile]::OpenRead($DocxPath)
    try {
        $entry = $archive.GetEntry("word/document.xml")
        if ($null -eq $entry) {
            throw "Missing word/document.xml in DOCX archive."
        }

        $stream = $entry.Open()
        $reader = New-Object System.IO.StreamReader($stream)
        try {
            [xml]$xml = $reader.ReadToEnd()
        } finally {
            $reader.Dispose()
            $stream.Dispose()
        }
    } finally {
        $archive.Dispose()
    }

    $namespaceUri = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    $manager = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
    $manager.AddNamespace("w", $namespaceUri)

    $paragraphNodes = $xml.SelectNodes("//w:p", $manager)
    $paragraphs = New-Object System.Collections.Generic.List[string]
    foreach ($p in $paragraphNodes) {
        $textNodes = $p.SelectNodes(".//w:t", $manager)
        if ($null -eq $textNodes -or $textNodes.Count -eq 0) {
            continue
        }
        $parts = @()
        foreach ($node in $textNodes) {
            if (-not [string]::IsNullOrWhiteSpace($node.InnerText)) {
                $parts += $node.InnerText
            }
        }
        $joined = ($parts -join "").Trim()
        if (-not [string]::IsNullOrWhiteSpace($joined)) {
            $paragraphs.Add($joined)
        }
    }

    return $paragraphs
}

function Build-AccessibleHtml {
    param(
        [string]$Title,
        [System.Collections.Generic.List[string]]$Paragraphs
    )

    $safeTitle = [System.Net.WebUtility]::HtmlEncode($Title)
    $lines = New-Object System.Collections.Generic.List[string]
    $lines.Add('<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;">')
    $lines.Add('  <section aria-labelledby="doc-title">')
    $lines.Add("    <h2 id=`"doc-title`">$safeTitle</h2>")

    $inList = $false
    foreach ($raw in $Paragraphs) {
        $line = $raw.Trim()
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $looksLikeHeader = $line.EndsWith(":") -and ($line.Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries).Count -le 12)
        $looksLikeList = [System.Text.RegularExpressions.Regex]::IsMatch($line, '^(\d+[\.\)]|[-*•])\s+')

        if ($looksLikeHeader) {
            if ($inList) {
                $lines.Add("    </ul>")
                $inList = $false
            }
            $headerText = $line.TrimEnd(":").Trim()
            if ([string]::IsNullOrWhiteSpace($headerText)) {
                $headerText = $line
            }
            $lines.Add("    <h3>$(Linkify $headerText)</h3>")
            continue
        }

        if ($looksLikeList) {
            if (-not $inList) {
                $lines.Add("    <ul>")
                $inList = $true
            }
            $item = [System.Text.RegularExpressions.Regex]::Replace($line, '^(\d+[\.\)]|[-*•])\s+', '')
            $lines.Add("      <li>$(Linkify $item)</li>")
            continue
        }

        if ($inList) {
            $lines.Add("    </ul>")
            $inList = $false
        }
        $lines.Add("    <p>$(Linkify $line)</p>")
    }

    if ($inList) {
        $lines.Add("    </ul>")
    }
    $lines.Add("  </section>")
    $lines.Add("</div>")

    return ($lines -join [Environment]::NewLine) + [Environment]::NewLine
}

function Process-Once {
    param([string]$Root)

    $paths = Ensure-Directories -Root $Root
    $statePath = Join-Path $paths.state "pipeline_state.json"
    $state = Load-State -StatePath $statePath
    if (-not $state.files) {
        $state.files = @{}
    }

    $processed = 0
    $skipped = 0
    $failed = 0

    $incomingFiles = Get-ChildItem -LiteralPath $paths.incoming -Filter "*.docx" -File | Sort-Object Name
    foreach ($file in $incomingFiles) {
        $hash = Get-FileSha256 -Path $file.FullName
        $key = $file.Name
        $previous = $null
        if ($state.files.ContainsKey($key)) {
            $previous = $state.files[$key]
        }

        if ($null -ne $previous -and $previous.sha256 -eq $hash -and $previous.status -eq "processed") {
            $skipped++
            continue
        }

        try {
            $paragraphs = Get-DocxParagraphs -DocxPath $file.FullName
            if ($paragraphs.Count -eq 0) {
                throw "No readable paragraph text found."
            }

            $title = $file.BaseName -replace "[_-]", " "
            $title = $title.Trim()
            if ([string]::IsNullOrWhiteSpace($title)) {
                $title = "Document"
            }

            $html = Build-AccessibleHtml -Title $title -Paragraphs $paragraphs
            $reviewOutput = Join-Path $paths.review ($file.BaseName + ".html")
            Set-Content -LiteralPath $reviewOutput -Value $html -Encoding UTF8

            $processedPath = Join-Path $paths.processed $file.Name
            Move-Item -LiteralPath $file.FullName -Destination $processedPath -Force

            $state.files[$key] = @{
                sha256 = $hash
                status = "processed"
                processed_at = [DateTime]::UtcNow.ToString("o")
                source_path = $processedPath
                review_output_path = $reviewOutput
            }
            $processed++
        } catch {
            $failedPath = Join-Path $paths.failed $file.Name
            if (Test-Path -LiteralPath $file.FullName) {
                Move-Item -LiteralPath $file.FullName -Destination $failedPath -Force
            }
            $state.files[$key] = @{
                sha256 = $hash
                status = "failed"
                processed_at = [DateTime]::UtcNow.ToString("o")
                source_path = $failedPath
                error = $_.Exception.Message
            }
            $failed++
        }
    }

    Save-State -StatePath $statePath -State $state
    return @{
        processed = $processed
        skipped = $skipped
        failed = $failed
        root = $Root
    }
}

$resolvedBaseDir = [System.IO.Path]::GetFullPath($BaseDir)
Ensure-Directories -Root $resolvedBaseDir | Out-Null

if (-not $Loop) {
    $result = Process-Once -Root $resolvedBaseDir
    Write-Output ("Run complete | processed={0} skipped={1} failed={2} | base_dir={3}" -f $result.processed, $result.skipped, $result.failed, $result.root)
    exit 0
}

Write-Output ("Watching for .docx files in: {0} (interval={1}s)" -f (Join-Path $resolvedBaseDir "incoming"), $IntervalSeconds)
while ($true) {
    $result = Process-Once -Root $resolvedBaseDir
    Write-Output ("{0} | processed={1} skipped={2} failed={3}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ss"), $result.processed, $result.skipped, $result.failed)
    Start-Sleep -Seconds ([Math]::Max(1, $IntervalSeconds))
}
