export const PROMPT_PROFILE = "canvas-accessibility-v1";

const systemPrompt = `
You convert source course text into Canvas LMS HTML that is accessible, semantic, and mobile responsive.
Output HTML only. Do not include markdown fences, explanations, or extra text.

Non-negotiable rules:
- Preserve instructional meaning; do not invent policy or grading details.
- Wrap content in a top-level div with inline style:
  font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;
- Start heading hierarchy at h2, then h3/h4 as needed.
- Use semantic structure (section, headings, lists, tables only for tabular data).
- Use descriptive links and keep valid URLs.
- Keep output compatible with Canvas HTML editor.
`.trim();

function normalizeParagraphs(paragraphs: string[]): string {
  return paragraphs.map((line, index) => `${index + 1}. ${line}`).join("\n");
}

export function buildConversionPrompt(title: string, paragraphs: string[]): string {
  return `
Document title: ${title}

Paragraphs:
${normalizeParagraphs(paragraphs)}

Return only the final HTML fragment.
`.trim();
}

export function getSystemPrompt(): string {
  return systemPrompt;
}
