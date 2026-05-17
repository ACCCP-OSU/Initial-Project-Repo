import { describe, expect, it } from "vitest";

import { validateCanvasHtml } from "@/lib/conversion/validate";

describe("validateCanvasHtml", () => {
  it("flags missing wrapper and h2 start", () => {
    const output = validateCanvasHtml("<section><h3>Wrong Start</h3></section>");
    expect(output.some((item) => item.code === "wrapper.missing")).toBe(true);
    expect(output.some((item) => item.code === "heading.first_not_h2")).toBe(true);
  });

  it("passes valid minimum shell", () => {
    const output = validateCanvasHtml(
      '<div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #1f2933; max-width: 900px; margin: 0 auto;"><h2>Title</h2><p>Hello</p></div>'
    );
    expect(output.some((item) => item.code === "validation.pass")).toBe(true);
  });
});
