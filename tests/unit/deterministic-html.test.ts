import { describe, expect, it } from "vitest";

import { buildDeterministicAccessibleHtml } from "@/lib/conversion/deterministic-html";

describe("buildDeterministicAccessibleHtml", () => {
  it("builds h2 wrapper and list structure", () => {
    const html = buildDeterministicAccessibleHtml("Sample Doc", [
      "Overview:",
      "- First point",
      "- Second point",
      "https://example.edu/resource"
    ]);

    expect(html).toContain("<h2 id=\"doc-title\">Sample Doc</h2>");
    expect(html).toContain("<h3>Overview</h3>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>First point</li>");
    expect(html).toContain("<a href=\"https://example.edu/resource\">https://example.edu/resource</a>");
  });
});
