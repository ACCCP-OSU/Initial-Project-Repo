import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { config } from "@/lib/config";

export function hashBufferSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function getUploadPath(jobId: string): string {
  return join(config.storageRoot, "uploads", `${jobId}.docx`);
}

export function getArtifactHtmlPath(jobId: string): string {
  return join(config.storageRoot, "artifacts", `${jobId}.html`);
}

export function getArtifactReviewPath(jobId: string): string {
  return join(config.storageRoot, "artifacts", `${jobId}.review.json`);
}

export async function writeFileSafe(path: string, content: Buffer | string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

export async function readFileBuffer(path: string): Promise<Buffer> {
  return readFile(path);
}

export async function readFileText(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function deleteIfExists(path: string): Promise<boolean> {
  try {
    await unlink(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    return false;
  }
}
