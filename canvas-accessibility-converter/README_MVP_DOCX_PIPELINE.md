# MVP: Word Document Accessibility Pipeline

This proof-of-concept pipeline processes new `.docx` files from an intake folder and routes outputs for human review.

## What It Does

1. Scans `incoming/` for new `.docx` files.
2. Extracts paragraph text directly from the Word file.
3. Builds semantic HTML with accessibility-first defaults.
4. Writes HTML to `review/`.
5. Moves source docs to `processed/` on success or `failed/` on error.
6. Records status in `state/pipeline_state.json`.

## MVP Folder Structure

Use a base directory (default is `pipeline_workspace/` under this project):

```text
pipeline_workspace/
  incoming/
  review/
  processed/
  failed/
  state/
    pipeline_state.json
```

## Run Once (PowerShell, Recommended)

From this project folder:

```powershell
.\mvp_docx_pipeline.ps1
```

Run with a custom base folder:

```powershell
.\mvp_docx_pipeline.ps1 -BaseDir "C:\Path\To\PilotPipeline"
```

## Run as a Polling Service

Check every 5 minutes:

```powershell
.\mvp_docx_pipeline.ps1 -Loop -IntervalSeconds 300
```

## Optional: Windows Task Scheduler (No Always-On Terminal)

Create a recurring scheduled task that runs every 15 minutes:

```powershell
$script = "C:\Users\alai04\OneDrive - The Ohio State University Wexner Medical Center\Desktop\Accessibility\canvas-accessibility-converter\mvp_docx_pipeline.ps1"
$base = "C:\Users\alai04\OneDrive - The Ohio State University Wexner Medical Center\Desktop\Accessibility\canvas-accessibility-converter\pipeline_workspace"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -BaseDir `"$base`""
$trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).Date -RepetitionInterval (New-TimeSpan -Minutes 15)
Register-ScheduledTask -TaskName "DOCX Accessibility MVP" -Action $action -Trigger $trigger -Description "Process new docx files into accessible HTML for review"
```

## Optional Python Version

An equivalent Python script is included at `mvp_docx_pipeline.py` if your environment has Python installed.

## Current Limitations (Expected for MVP)

- Supports `.docx` only (not legacy `.doc`, PDF, or PPT/PPTX yet).
- Uses structural heuristics (headings/lists/paragraphs) and does not fully repair document-internal accessibility tags.
- Does not call an external LLM yet; output is deterministic for pilot consistency.
- Does not validate external hyperlinks over network in this version.

## Next Iteration Recommendations

1. Add an LLM post-processing step to improve heading hierarchy, link text quality, and alt-text suggestions.
2. Add quality checks (reading-order checks, heading-depth checks, link audit, plain-language lint).
3. Add queue IDs and processing logs for high-volume batch reporting.
4. Expand inputs to `.pptx` and PDF with format-specific extractors.
