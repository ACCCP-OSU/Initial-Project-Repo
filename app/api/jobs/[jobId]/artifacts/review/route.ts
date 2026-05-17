import { readFile } from "node:fs/promises";

import { NextRequest, NextResponse } from "next/server";

import { requireRouteUser } from "@/lib/auth/guards";
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
  if (job.status !== "completed") {
    return NextResponse.json({ error: "Artifact not available until conversion completes." }, { status: 409 });
  }

  const artifactPath = getArtifactPath(jobId, "review_json");
  if (!artifactPath) {
    return NextResponse.json({ error: "Review artifact not found." }, { status: 404 });
  }

  const content = await readFile(artifactPath, "utf8");
  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${job.sourceFilename.replace(/\.docx$/i, "")}.review.json"`
    }
  });
}
