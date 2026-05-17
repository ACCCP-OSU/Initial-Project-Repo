import { getUploadPath, deleteIfExists } from "@/lib/storage/files";
import {
  cleanupExpiredSessions,
  deleteArtifactsForExpiredJobs,
  expireJobs,
  listExpiredArtifacts,
  listExpiredJobIds
} from "@/lib/repositories";

export async function runRetentionSweep(): Promise<{
  expiredJobs: number;
  deletedArtifacts: number;
  deletedFiles: number;
  deletedSessions: number;
}> {
  const cutoff = new Date().toISOString();
  const artifactRows = listExpiredArtifacts(cutoff);
  const expiredJobIds = listExpiredJobIds(cutoff);
  let deletedFiles = 0;
  const seenPaths = new Set<string>();

  for (const artifact of artifactRows) {
    if (!seenPaths.has(artifact.path)) {
      seenPaths.add(artifact.path);
      const deleted = await deleteIfExists(artifact.path);
      if (deleted) {
        deletedFiles += 1;
      }
    }
  }

  for (const jobId of expiredJobIds) {
    const deleted = await deleteIfExists(getUploadPath(jobId));
    if (deleted) {
      deletedFiles += 1;
    }
  }

  const expiredJobs = expireJobs(cutoff);
  const deletedArtifacts = deleteArtifactsForExpiredJobs(cutoff);
  const deletedSessions = cleanupExpiredSessions();

  return {
    expiredJobs,
    deletedArtifacts,
    deletedFiles,
    deletedSessions
  };
}
