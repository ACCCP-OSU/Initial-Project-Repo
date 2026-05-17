import { basename } from "node:path";

import { buildDeterministicAccessibleHtml } from "@/lib/conversion/deterministic-html";
import { extractDocxParagraphs } from "@/lib/conversion/docx";
import { convertWithOpenAI } from "@/lib/conversion/openai";
import { buildConversionPrompt, getSystemPrompt, PROMPT_PROFILE } from "@/lib/conversion/prompt";
import { validateCanvasHtml } from "@/lib/conversion/validate";
import type { ReviewArtifact } from "@/lib/models";
import {
  addJobEvent,
  completeJob,
  failJob,
  getJobById,
  upsertArtifact
} from "@/lib/repositories";
import {
  getArtifactHtmlPath,
  getArtifactReviewPath,
  getUploadPath,
  readFileBuffer,
  writeFileSafe
} from "@/lib/storage/files";

function inferTitle(filename: string): string {
  const stem = basename(filename).replace(/\.docx$/i, "");
  const normalized = stem.replace(/[_-]+/g, " ").trim();
  return normalized.length > 0 ? normalized : "Document";
}

export async function processJobById(jobId: string, useDeterministicFallback = false): Promise<void> {
  const job = getJobById(jobId);
  if (!job) {
    return;
  }

  try {
    const sourcePath = getUploadPath(job.id);
    const fileBuffer = await readFileBuffer(sourcePath);
    const paragraphs = await extractDocxParagraphs(fileBuffer);
    if (paragraphs.length === 0) {
      throw new Error("No readable paragraph text found in document.");
    }

    const title = inferTitle(job.sourceFilename);
    const systemPrompt = getSystemPrompt();
    const userPrompt = buildConversionPrompt(title, paragraphs);

    let html = await convertWithOpenAI(systemPrompt, userPrompt);
    if (!html.trim().startsWith("<")) {
      if (!useDeterministicFallback) {
        throw new Error("Model output is not valid HTML.");
      }
      addJobEvent(job.id, "conversion.fallback", { reason: "non_html_output" });
      html = buildDeterministicAccessibleHtml(title, paragraphs);
    }

    const validationResults = validateCanvasHtml(html);
    const htmlPath = getArtifactHtmlPath(job.id);
    const reviewPath = getArtifactReviewPath(job.id);

    const reviewArtifact: ReviewArtifact = {
      source_filename: job.sourceFilename,
      source_sha256: job.sourceSha256,
      processed_at: new Date().toISOString(),
      model: job.model,
      prompt_profile: PROMPT_PROFILE,
      validation_results: validationResults,
      user_review_required: true,
      error: null
    };

    await writeFileSafe(htmlPath, html);
    await writeFileSafe(reviewPath, JSON.stringify(reviewArtifact, null, 2));

    upsertArtifact(job.id, "html", htmlPath);
    upsertArtifact(job.id, "review_json", reviewPath);
    completeJob(job.id, JSON.stringify(validationResults));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    failJob(job.id, message);
    throw error;
  }
}
