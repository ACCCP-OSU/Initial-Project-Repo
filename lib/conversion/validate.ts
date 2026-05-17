import type { ValidationResult } from "@/lib/models";

function collectHeadings(html: string): number[] {
  const matches = html.matchAll(/<h([1-6])\b[^>]*>/gi);
  return Array.from(matches, (match) => Number.parseInt(match[1], 10));
}

export function validateCanvasHtml(html: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const normalized = html.trim();

  const hasRequiredWrapper =
    /<div\b[^>]*style=["'][^"']*font-family:\s*Arial,\s*Helvetica,\s*sans-serif;[^"']*max-width:\s*900px;[^"']*["'][^>]*>/i.test(
      normalized
    );
  if (!hasRequiredWrapper) {
    results.push({
      code: "wrapper.missing",
      severity: "warning",
      message: "Top-level Canvas wrapper style is missing or does not match required accessibility defaults."
    });
  }

  const firstHeadingMatch = normalized.match(/<h([1-6])\b/i);
  if (!firstHeadingMatch) {
    results.push({
      code: "heading.none",
      severity: "warning",
      message: "No heading was detected. Output should start with an h2 heading."
    });
  } else if (firstHeadingMatch[1] !== "2") {
    results.push({
      code: "heading.first_not_h2",
      severity: "warning",
      message: `First heading is h${firstHeadingMatch[1]}; Canvas content should begin at h2.`
    });
  }

  const emptyLinks = normalized.match(/<a\b[^>]*>\s*<\/a>/gi) ?? [];
  if (emptyLinks.length > 0) {
    results.push({
      code: "link.empty_text",
      severity: "warning",
      message: `${emptyLinks.length} link(s) have empty text.`
    });
  }

  const malformedAnchors = normalized.match(/<a\b(?![^>]*href=)[^>]*>|<a\b[^>]*href=["']\s*(?:javascript:|#)?\s*["'][^>]*>/gi) ?? [];
  if (malformedAnchors.length > 0) {
    results.push({
      code: "link.malformed",
      severity: "warning",
      message: `${malformedAnchors.length} malformed anchor(s) were detected.`
    });
  }

  const headingLevels = collectHeadings(normalized);
  for (let index = 1; index < headingLevels.length; index += 1) {
    const previous = headingLevels[index - 1];
    const current = headingLevels[index];
    if (current - previous > 1) {
      results.push({
        code: "heading.skip_level",
        severity: "info",
        message: `Heading level jumps from h${previous} to h${current}.`
      });
      break;
    }
  }

  if (results.length === 0) {
    results.push({
      code: "validation.pass",
      severity: "info",
      message: "No automated warnings detected."
    });
  }

  return results;
}
