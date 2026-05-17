import { describe, expect, it } from "vitest";

import { buildConversionPrompt, getSystemPrompt } from "@/lib/conversion/prompt";

describe("conversion prompts", () => {
  it("includes title and paragraphs", () => {
    const prompt = buildConversionPrompt("Intro to Anatomy", ["Paragraph one", "Paragraph two"]);
    expect(prompt).toContain("Document title: Intro to Anatomy");
    expect(prompt).toContain("1. Paragraph one");
    expect(prompt).toContain("2. Paragraph two");
  });

  it("enforces html-only contract in system prompt", () => {
    const system = getSystemPrompt();
    expect(system).toContain("Output HTML only");
    expect(system).toContain("Start heading hierarchy at h2");
  });
});
