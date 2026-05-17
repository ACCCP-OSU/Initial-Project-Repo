import { NextRequest, NextResponse } from "next/server";

import { requireRouteUser } from "@/lib/auth/guards";
import { parseWarningsJson } from "@/lib/jobs/serialization";
import { getArtifactPath, getJobForUser } from "@/lib/repositories";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export async function GET(request: NextRequest, { params }: RouteParams) {
  const userOrResponse = requireRouteUser(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const { jobId } = await Promise.resolve(params);
  const job = getJobForUser(jobId, userOrResponse.id);
  if (!job) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: job.id,
    source_filename: job.sourceFilename,
    source_sha256: job.sourceSha256,
    status: job.status,
    model: job.model,
    prompt_profile: job.promptProfile,
    error: job.error,
    attempt_count: job.attemptCount,
    validation_results: parseWarningsJson(job.warningsJson),
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    processed_at: job.processedAt,
    expires_at: job.expiresAt,
    artifacts: {
      html: Boolean(getArtifactPath(job.id, "html")),
      review_json: Boolean(getArtifactPath(job.id, "review_json"))
    }
  });
}
