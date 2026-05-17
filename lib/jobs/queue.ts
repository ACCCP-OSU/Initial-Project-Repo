import { claimNextQueuedJob } from "@/lib/repositories";
import { processJobById } from "@/lib/jobs/process-job";

export async function processNextQueuedJob(): Promise<boolean> {
  const job = claimNextQueuedJob();
  if (!job) {
    return false;
  }
  await processJobById(job.id);
  return true;
}
