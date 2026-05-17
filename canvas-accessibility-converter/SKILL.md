---
name: canvas-accessibility-converter
description: Convert instructor-provided course text or documents into accessible, mobile-responsive HTML for Instructure Canvas LMS while preserving source meaning. Use when users ask to rewrite or format course pages/modules/assignments into Canvas-ready HTML, enforce Buckeye UX (BUX) design conventions, meet WCAG 2.1 AA, validate links, and provide paste-ready Canvas HTML editor instructions.
---

# Canvas Accessibility Converter

Convert source course content into production-ready HTML for Canvas.

## Workflow

1. Parse the input source and preserve all core instructional meaning.
2. Rebuild the structure with semantic HTML that starts at `h2` (Canvas page title is `h1`).
3. Apply accessibility and responsive patterns required by this skill.
4. Verify hyperlinks when tool access allows; report failures with location context.
5. Return final HTML and concise Canvas implementation steps.

## Required Output Contract

Produce output in this order:

1. `Accessibility summary` (5-10 bullets)
2. `Canvas-ready HTML` (single fenced HTML block)
3. `Broken link report` (table; or "No broken links found"; or "Unable to verify links" with reason)
4. `How to add in Canvas` (numbered steps)

## Content Rules

- Preserve substantive source text and intent; do not invent policy, dates, or grading rules.
- Improve clarity only through structure, semantics, and concise plain-language phrasing.
- Retain all source hyperlinks unless a link is confirmed invalid.
- Use a logical heading outline that begins with `h2`, then `h3`/`h4` as needed.
- Use sans-serif font declarations only.
- Avoid placeholder text such as "lorem ipsum".

## Accessibility Rules (WCAG 2.1 AA)

Apply these requirements every time:

- Use semantic landmarks and structure (`section`, headings, lists, tables, `figure` when relevant).
- Ensure link text is descriptive and unique in context (avoid "click here").
- Preserve color contrast at AA minimum.
- Provide text alternatives for meaningful visual indicators.
- Use tables only for tabular data.
- Add table `caption`, proper header cells, and `scope` attributes.
- Use description lists (`dl`, `dt`, `dd`) when presenting term-definition or label-value content.
- Add ARIA only when native HTML semantics are insufficient.
- Do not rely on color alone to communicate meaning.

## BUX + Canvas Styling Rules

Use inline styles so rendering remains stable in Canvas themes.

- Keep typography sans-serif: `font-family: Arial, Helvetica, sans-serif;`.
- Use restrained spacing and line-height for readability on desktop and mobile.
- Prefer BUX-aligned neutral backgrounds and high-contrast text.
- Keep layout simple and robust for Canvas Rich Content Editor output.

When returning HTML, include a wrapper like:

```html
<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;">
  <!-- content -->
</div>
```

## Responsive Table Pattern

Wrap every data table with horizontal scrolling:

```html
<div style="overflow-x: auto; -webkit-overflow-scrolling: touch; margin: 1rem 0;">
  <table style="border-collapse: collapse; width: 100%; min-width: 640px;">
    <caption style="text-align: left; font-weight: 700; margin-bottom: 0.5rem;">Caption text</caption>
    <thead>
      <tr>
        <th scope="col" style="text-align: left; border: 1px solid #d0d7de; padding: 0.5rem;">Header</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #d0d7de; padding: 0.5rem;">Value</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Link Validation

Attempt to validate each URL with available tools (prefer `HEAD`, fallback `GET`).

Classify as broken when any of the following is confirmed:

- DNS resolution failure
- Connection failure or timeout after retries
- HTTP status `4xx` or `5xx`

If validation is blocked (environment/network restrictions), state that clearly and do not guess. Always report each affected link with:

- URL
- section or heading location
- status/error detail

## Canvas LMS Implementation Steps

Always provide these instructions after the HTML block:

1. Open the Canvas page, assignment, discussion, or module item.
2. Open the Rich Content Editor and switch to `HTML Editor` view.
3. Paste the provided HTML.
4. Save, then preview in desktop and mobile views.
5. Run Canvas Accessibility Checker and fix any flagged issues.

## References

Use these standards when interpreting requirements:

- BUX design system: <https://bux.osu.edu/>
- WCAG 2.1: <https://www.w3.org/TR/WCAG21/>
