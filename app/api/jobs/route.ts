import { NextRequest, NextResponse } from "next/server";

import { requireRouteUser } from "@/lib/auth/guards";
import { config } from "@/lib/config";
import { PROMPT_PROFILE } from "@/lib/conversion/prompt";
import {
  addJobEvent,
  createJob,
  failJob,
  findReusableCompletedJob,
  listJobsForUser
} from "@/lib/repositories";
import { getUploadPath, hashBufferSha256, writeFileSafe } from "@/lib/storage/files";

export const runtime = "nodejs";

function isFileValue(value: FormDataEntryValue | null): value is File {
  return Boolean(value) && typeof value !== "string";
}

export async function GET(request: NextRequest) {
  const userOrResponse = requireRouteUser(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const jobs = listJobsForUser(userOrResponse.id).map((job) => ({
    id: job.id,
    source_filename: job.sourceFilename,
    source_sha256: job.sourceSha256,
    status: job.status,
    model: job.model,
    prompt_profile: job.promptProfile,
    error: job.error,
    attempt_count: job.attemptCount,
    created_at: job.createdAt,
    updated_at: job.updatedAt,
    processed_at: job.processedAt,
    expires_at: job.expiresAt
  }));
  return NextResponse.json({ jobs });
}

export async function POST(request: NextRequest) {
  const userOrResponse = requireRouteUser(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const formData = await request.formData();
  const fileEntry = formData.get("file");
  if (!isFileValue(fileEntry)) {
    return NextResponse.json({ error: "Missing file in multipart form data." }, { status: 400 });
  }
  if (!fileEntry.name.toLowerCase().endsWith(".docx")) {
    return NextResponse.json({ error: "Only .docx uploads are supported." }, { status: 400 });
  }
  if (fileEntry.size > config.maxUploadBytes) {
    return NextResponse.json(
      { error: `File exceeds upload limit of ${config.maxUploadBytes} bytes.` },
      { status: 413 }
    );
  }

  const fileBuffer = Buffer.from(await fileEntry.arrayBuffer());
  const sourceSha256 = hashBufferSha256(fileBuffer);

  if (!config.openai.apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured. Conversion cannot be queued." },
      { status: 503 }
    );
  }

  const existing = findReusableCompletedJob(userOrResponse.id, sourceSha256);
  if (existing) {
    return NextResponse.json({
      job_id: existing.id,
      status: existing.status,
      deduplicated: true
    });
  }

  const job = createJob({
    userId: userOrResponse.id,
    sourceFilename: fileEntry.name,
    sourceSha256,
    model: config.openai.model,
    promptProfile: PROMPT_PROFILE
  });

  const uploadPath = getUploadPath(job.id);
  try {
    await writeFileSafe(uploadPath, fileBuffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to persist uploaded file.";
    failJob(job.id, message);
    return NextResponse.json({ error: "Unable to store uploaded file for processing." }, { status: 500 });
  }
  addJobEvent(job.id, "job.uploaded", { filename: fileEntry.name, size: fileEntry.size });

  return NextResponse.json(
    {
      job_id: job.id,
      status: job.status,
      deduplicated: false
    },
    { status: 201 }
  );
}
