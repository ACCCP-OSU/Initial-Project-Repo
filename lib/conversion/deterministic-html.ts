const urlRegex = /(https?:\/\/[^\s<>"]+)/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function linkify(value: string): string {
  return escapeHtml(value).replace(urlRegex, '<a href="$1">$1</a>');
}

export function buildDeterministicAccessibleHtml(title: string, paragraphs: string[]): string {
  const safeTitle = escapeHtml(title);
  const lines: string[] = [
    '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;">',
    '  <section aria-labelledby="doc-title">',
    `    <h2 id="doc-title">${safeTitle}</h2>`
  ];

  let inList = false;
  for (const rawLine of paragraphs) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    const looksLikeHeader = line.endsWith(":") && line.split(/\s+/).length <= 12;
    const looksLikeList = /^(\d+[\.\)]|[-*\u2022])\s+/.test(line);

    if (looksLikeHeader) {
      if (inList) {
        lines.push("    </ul>");
        inList = false;
      }
      const headerText = line.slice(0, -1).trim() || line;
      lines.push(`    <h3>${linkify(headerText)}</h3>`);
      continue;
    }

    if (looksLikeList) {
      if (!inList) {
        lines.push("    <ul>");
        inList = true;
      }
      const itemText = line.replace(/^(\d+[\.\)]|[-*\u2022])\s+/, "");
      lines.push(`      <li>${linkify(itemText)}</li>`);
      continue;
    }

    if (inList) {
      lines.push("    </ul>");
      inList = false;
    }
    lines.push(`    <p>${linkify(line)}</p>`);
  }

  if (inList) {
    lines.push("    </ul>");
  }
  lines.push("  </section>");
  lines.push("</div>");
  return `${lines.join("\n")}\n`;
}
