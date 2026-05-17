import { runRetentionSweep } from "../lib/jobs/retention";

async function main(): Promise<void> {
  const result = await runRetentionSweep();
  console.log(
    `[retention] expiredJobs=${result.expiredJobs} deletedArtifacts=${result.deletedArtifacts} deletedFiles=${result.deletedFiles} deletedSessions=${result.deletedSessions}`
  );
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : "unknown retention error";
  console.error(`[retention] failed: ${message}`);
  process.exit(1);
});
