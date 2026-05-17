#!/usr/bin/env python3
"""
MVP accessibility pipeline for Word documents (.docx).

What this does:
- Watches/scans an incoming folder for .docx files.
- Extracts visible paragraph text from each .docx.
- Produces semantic, mobile-friendly HTML suitable for accessibility review.
- Moves originals to processed/ (or failed/) and writes outputs to review/.

This script intentionally avoids third-party dependencies for fast pilot setup.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Tuple
from xml.etree import ElementTree

W_NS = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
URL_RE = re.compile(r"(https?://[^\s<>\"]+)")


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def extract_docx_paragraphs(docx_path: Path) -> List[str]:
    with zipfile.ZipFile(docx_path, "r") as zf:
        with zf.open("word/document.xml") as xml_file:
            tree = ElementTree.parse(xml_file)
    root = tree.getroot()
    paragraphs: List[str] = []
    for p in root.iter(f"{W_NS}p"):
        parts: List[str] = []
        for t in p.iter(f"{W_NS}t"):
            if t.text:
                parts.append(t.text)
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)
    return paragraphs


def linkify(text: str) -> str:
    escaped = html.escape(text, quote=True)
    return URL_RE.sub(r'<a href="\1">\1</a>', escaped)


def build_accessible_html(title: str, paragraphs: List[str]) -> str:
    safe_title = html.escape(title, quote=True)
    body_lines: List[str] = [
        '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;">',
        f'  <section aria-labelledby="doc-title">',
        f'    <h2 id="doc-title">{safe_title}</h2>',
    ]

    # Heuristic structure:
    # - Lines ending with ":" become h3 section headers.
    # - Numbered/bulleted lines become list items.
    # - Everything else becomes paragraph content.
    in_list = False
    for line in paragraphs:
        stripped = line.strip()
        if not stripped:
            continue

        looks_like_header = stripped.endswith(":") and len(stripped.split()) <= 12
        looks_like_list = bool(re.match(r"^(\d+[\.\)]|[-*•])\s+", stripped))

        if looks_like_header:
            if in_list:
                body_lines.append("    </ul>")
                in_list = False
            header_text = stripped[:-1].strip() or stripped
            body_lines.append(f"    <h3>{linkify(header_text)}</h3>")
            continue

        if looks_like_list:
            if not in_list:
                body_lines.append("    <ul>")
                in_list = True
            item = re.sub(r"^(\d+[\.\)]|[-*•])\s+", "", stripped)
            body_lines.append(f"      <li>{linkify(item)}</li>")
            continue

        if in_list:
            body_lines.append("    </ul>")
            in_list = False
        body_lines.append(f"    <p>{linkify(stripped)}</p>")

    if in_list:
        body_lines.append("    </ul>")

    body_lines.extend(
        [
            "  </section>",
            "</div>",
        ]
    )
    return "\n".join(body_lines) + "\n"


def load_state(state_path: Path) -> Dict[str, Dict[str, str]]:
    if not state_path.exists():
        return {"files": {}}
    try:
        with state_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        if not isinstance(data, dict) or "files" not in data:
            return {"files": {}}
        return data
    except json.JSONDecodeError:
        return {"files": {}}


def save_state(state_path: Path, state: Dict[str, Dict[str, str]]) -> None:
    state_path.parent.mkdir(parents=True, exist_ok=True)
    with state_path.open("w", encoding="utf-8") as f:
        json.dump(state, f, indent=2)


def ensure_dirs(base_dir: Path) -> Dict[str, Path]:
    paths = {
        "incoming": base_dir / "incoming",
        "review": base_dir / "review",
        "processed": base_dir / "processed",
        "failed": base_dir / "failed",
        "state": base_dir / "state",
    }
    for p in paths.values():
        p.mkdir(parents=True, exist_ok=True)
    return paths


def process_once(base_dir: Path) -> Tuple[int, int, int]:
    paths = ensure_dirs(base_dir)
    state_file = paths["state"] / "pipeline_state.json"
    state = load_state(state_file)
    files_state = state.setdefault("files", {})

    processed_count = 0
    skipped_count = 0
    failed_count = 0

    incoming_files = sorted(paths["incoming"].glob("*.docx"))
    for docx in incoming_files:
        file_hash = sha256_file(docx)
        state_key = str(docx.name)
        previous = files_state.get(state_key, {})
        if previous.get("sha256") == file_hash and previous.get("status") == "processed":
            skipped_count += 1
            continue

        try:
            paragraphs = extract_docx_paragraphs(docx)
            if not paragraphs:
                raise ValueError("No readable paragraph text found in document.")

            title = docx.stem.replace("_", " ").replace("-", " ").strip() or "Document"
            html_text = build_accessible_html(title, paragraphs)

            review_name = f"{docx.stem}.html"
            review_path = paths["review"] / review_name
            with review_path.open("w", encoding="utf-8") as f:
                f.write(html_text)

            target_docx = paths["processed"] / docx.name
            shutil.move(str(docx), str(target_docx))

            files_state[state_key] = {
                "sha256": file_hash,
                "status": "processed",
                "processed_at": now_utc_iso(),
                "source_path": str(target_docx),
                "review_output_path": str(review_path),
            }
            processed_count += 1
        except Exception as exc:  # noqa: BLE001 - explicit failure capture for pipeline reliability
            failed_target = paths["failed"] / docx.name
            if docx.exists():
                shutil.move(str(docx), str(failed_target))
            files_state[state_key] = {
                "sha256": file_hash,
                "status": "failed",
                "processed_at": now_utc_iso(),
                "source_path": str(failed_target),
                "error": str(exc),
            }
            failed_count += 1

    save_state(state_file, state)
    return processed_count, skipped_count, failed_count


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="MVP pipeline: convert incoming .docx files to reviewable accessible HTML."
    )
    parser.add_argument(
        "--base-dir",
        type=Path,
        default=Path.cwd() / "pipeline_workspace",
        help="Base directory containing incoming/review/processed/failed/state folders.",
    )
    parser.add_argument(
        "--loop",
        action="store_true",
        help="Run continuously and poll for new files.",
    )
    parser.add_argument(
        "--interval-seconds",
        type=int,
        default=300,
        help="Polling interval when --loop is enabled (default: 300).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    base_dir = args.base_dir.resolve()
    ensure_dirs(base_dir)

    if not args.loop:
        processed, skipped, failed = process_once(base_dir)
        print(
            f"Run complete | processed={processed} skipped={skipped} failed={failed} | base_dir={base_dir}"
        )
        return 0

    print(f"Watching for .docx files in: {base_dir / 'incoming'} (interval={args.interval_seconds}s)")
    while True:
        processed, skipped, failed = process_once(base_dir)
        print(
            f"{datetime.now().isoformat(timespec='seconds')} | processed={processed} skipped={skipped} failed={failed}"
        )
        time.sleep(max(1, args.interval_seconds))


if __name__ == "__main__":
    raise SystemExit(main())
