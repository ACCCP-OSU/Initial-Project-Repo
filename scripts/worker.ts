import { setTimeout as sleep } from "node:timers/promises";

import { config } from "../lib/config";
import { processNextQueuedJob } from "../lib/jobs/queue";

let shouldStop = false;

process.on("SIGINT", () => {
  shouldStop = true;
});
process.on("SIGTERM", () => {
  shouldStop = true;
});

async function run(): Promise<void> {
  console.log(`[worker] starting | pollMs=${config.workerPollMs}`);
  while (!shouldStop) {
    try {
      const processedOne = await processNextQueuedJob();
      if (!processedOne) {
        await sleep(config.workerPollMs);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown worker error";
      console.error(`[worker] job processing error: ${message}`);
      await sleep(config.workerPollMs);
    }
  }
  console.log("[worker] stopped");
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown fatal error";
  console.error(`[worker] fatal error: ${message}`);
  process.exit(1);
});
