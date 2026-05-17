import { describe, expect, it } from "vitest";

import { parseWarningsJson } from "@/lib/jobs/serialization";

describe("warning serialization contract", () => {
  it("returns only valid warning entries", () => {
    const parsed = parseWarningsJson(
      JSON.stringify([
        { code: "heading.first_not_h2", severity: "warning", message: "Issue" },
        { code: 42 }
      ])
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].code).toBe("heading.first_not_h2");
  });
});
