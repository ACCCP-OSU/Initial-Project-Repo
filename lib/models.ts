export const jobStatuses = ["queued", "processing", "completed", "failed", "expired"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export type ArtifactKind = "html" | "review_json";

export type ValidationSeverity = "info" | "warning" | "error";

export type ValidationResult = {
  code: string;
  severity: ValidationSeverity;
  message: string;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string | null;
  externalId: string;
};

export type JobRecord = {
  id: string;
  userId: string;
  sourceFilename: string;
  sourceSha256: string;
  status: JobStatus;
  model: string;
  promptProfile: string;
  error: string | null;
  attemptCount: number;
  warningsJson: string | null;
  createdAt: string;
  updatedAt: string;
  processedAt: string | null;
  expiresAt: string;
};

export type ReviewArtifact = {
  source_filename: string;
  source_sha256: string;
  processed_at: string;
  model: string;
  prompt_profile: string;
  validation_results: ValidationResult[];
  user_review_required: true;
  error: string | null;
};
