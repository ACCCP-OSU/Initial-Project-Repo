import type { ValidationResult } from "@/lib/models";

export function parseWarningsJson(value: string | null): ValidationResult[] {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((entry): entry is ValidationResult => {
      return (
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as ValidationResult).code === "string" &&
        typeof (entry as ValidationResult).severity === "string" &&
        typeof (entry as ValidationResult).message === "string"
      );
    });
  } catch {
    return [];
  }
}
