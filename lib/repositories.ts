import "server-only";

import { randomUUID } from "node:crypto";

import { config } from "@/lib/config";
import { getDb, nowIso } from "@/lib/db";
import type { ArtifactKind, JobRecord, JobStatus, SessionUser } from "@/lib/models";

type UserRow = {
  id: string;
  external_id: string;
  email: string;
  display_name: string | null;
};

type JobRow = {
  id: string;
  user_id: string;
  source_filename: string;
  source_sha256: string;
  status: JobStatus;
  model: string;
  prompt_profile: string;
  error: string | null;
  attempt_count: number;
  warnings_json: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  expires_at: string;
};

function toSessionUser(row: UserRow): SessionUser {
  return {
    id: row.id,
    externalId: row.external_id,
    email: row.email,
    displayName: row.display_name
  };
}

function toJobRecord(row: JobRow): JobRecord {
  return {
    id: row.id,
    userId: row.user_id,
    sourceFilename: row.source_filename,
    sourceSha256: row.source_sha256,
    status: row.status,
    model: row.model,
    promptProfile: row.prompt_profile,
    error: row.error,
    attemptCount: row.attempt_count,
    warningsJson: row.warnings_json,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    processedAt: row.processed_at,
    expiresAt: row.expires_at
  };
}

export function upsertUserFromSaml(input: {
  externalId: string;
  email: string;
  displayName: string | null;
}): SessionUser {
  const db = getDb();
  const timestamp = nowIso();
  const existing = db
    .prepare("SELECT id, external_id, email, display_name FROM users WHERE external_id = ?")
    .get(input.externalId) as UserRow | undefined;

  if (existing) {
    db.prepare("UPDATE users SET email = ?, display_name = ?, updated_at = ? WHERE id = ?").run(
      input.email,
      input.displayName,
      timestamp,
      existing.id
    );
    syncAdminRole(existing.id, input.email);
    return {
      id: existing.id,
      externalId: input.externalId,
      email: input.email,
      displayName: input.displayName
    };
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, external_id, email, display_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, input.externalId, input.email, input.displayName, timestamp, timestamp);
  syncAdminRole(id, input.email);
  return {
    id,
    externalId: input.externalId,
    email: input.email,
    displayName: input.displayName
  };
}

function syncAdminRole(userId: string, email: string): void {
  const db = getDb();
  const isConfiguredAdmin = config.adminEmails.includes(email.toLowerCase());
  if (isConfiguredAdmin) {
    db.prepare("INSERT OR IGNORE INTO admin_roles (user_id, created_at) VALUES (?, ?)").run(userId, nowIso());
    return;
  }
  db.prepare("DELETE FROM admin_roles WHERE user_id = ?").run(userId);
}

export function createSession(userId: string): { token: string; expiresAt: string } {
  const db = getDb();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + config.session.ttlHours * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    userId,
    expiresAt,
    nowIso()
  );
  return { token, expiresAt };
}

export function deleteSession(sessionToken: string): void {
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionToken);
}

export function cleanupExpiredSessions(): number {
  const db = getDb();
  const result = db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
  return result.changes;
}

export function getUserFromSession(sessionToken: string | null | undefined): SessionUser | null {
  if (!sessionToken) {
    return null;
  }
  const db = getDb();
  const row = db
    .prepare(
      `SELECT users.id, users.external_id, users.email, users.display_name
       FROM sessions
       INNER JOIN users ON sessions.user_id = users.id
       WHERE sessions.id = ? AND sessions.expires_at > ?`
    )
    .get(sessionToken, nowIso()) as UserRow | undefined;

  if (!row) {
    return null;
  }
  return toSessionUser(row);
}

export function isAdminUser(userId: string): boolean {
  const db = getDb();
  const row = db.prepare("SELECT user_id FROM admin_roles WHERE user_id = ?").get(userId) as { user_id: string } | undefined;
  return Boolean(row);
}

export function createJob(input: {
  userId: string;
  sourceFilename: string;
  sourceSha256: string;
  model: string;
  promptProfile: string;
}): JobRecord {
  const db = getDb();
  const id = randomUUID();
  const timestamp = nowIso();
  const expiresAt = new Date(Date.now() + config.retentionDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO jobs (
      id, user_id, source_filename, source_sha256, status, model, prompt_profile, error,
      attempt_count, warnings_json, created_at, updated_at, processed_at, expires_at
    ) VALUES (?, ?, ?, ?, 'queued', ?, ?, NULL, 0, NULL, ?, ?, NULL, ?)`
  ).run(id, input.userId, input.sourceFilename, input.sourceSha256, input.model, input.promptProfile, timestamp, timestamp, expiresAt);
  addJobEvent(id, "job.queued", { sourceFilename: input.sourceFilename });
  return getJobById(id)!;
}

export function findReusableCompletedJob(userId: string, sourceSha256: string): JobRecord | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT *
       FROM jobs
       WHERE user_id = ?
         AND source_sha256 = ?
         AND status = 'completed'
         AND expires_at > ?
       ORDER BY processed_at DESC
       LIMIT 1`
    )
    .get(userId, sourceSha256, nowIso()) as JobRow | undefined;
  return row ? toJobRecord(row) : null;
}

export function listJobsForUser(userId: string): JobRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT *
       FROM jobs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 200`
    )
    .all(userId) as JobRow[];
  return rows.map(toJobRecord);
}

export function getJobById(jobId: string): JobRecord | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM jobs WHERE id = ?").get(jobId) as JobRow | undefined;
  return row ? toJobRecord(row) : null;
}

export function getJobForUser(jobId: string, userId: string): JobRecord | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM jobs WHERE id = ? AND user_id = ?")
    .get(jobId, userId) as JobRow | undefined;
  return row ? toJobRecord(row) : null;
}

export function addJobEvent(jobId: string, eventType: string, details: unknown): void {
  const db = getDb();
  db.prepare("INSERT INTO job_events (id, job_id, event_type, details_json, created_at) VALUES (?, ?, ?, ?, ?)").run(
    randomUUID(),
    jobId,
    eventType,
    JSON.stringify(details),
    nowIso()
  );
}

export function claimNextQueuedJob(): JobRecord | null {
  const db = getDb();
  const transaction = db.transaction((): JobRecord | null => {
    const candidate = db
      .prepare(
        `SELECT id
         FROM jobs
         WHERE status = 'queued'
         ORDER BY created_at ASC
         LIMIT 1`
      )
      .get() as { id: string } | undefined;

    if (!candidate) {
      return null;
    }

    const update = db
      .prepare(
        `UPDATE jobs
         SET status = 'processing', updated_at = ?, attempt_count = attempt_count + 1
         WHERE id = ? AND status = 'queued'`
      )
      .run(nowIso(), candidate.id);

    if (update.changes !== 1) {
      return null;
    }
    addJobEvent(candidate.id, "job.processing", {});
    return getJobById(candidate.id);
  });

  return transaction();
}

export function completeJob(jobId: string, warningsJson: string): void {
  const db = getDb();
  const timestamp = nowIso();
  db.prepare(
    `UPDATE jobs
     SET status = 'completed',
         warnings_json = ?,
         processed_at = ?,
         updated_at = ?,
         error = NULL
     WHERE id = ?`
  ).run(warningsJson, timestamp, timestamp, jobId);
  addJobEvent(jobId, "job.completed", {});
}

export function failJob(jobId: string, errorMessage: string): void {
  const db = getDb();
  db.prepare(
    `UPDATE jobs
     SET status = 'failed',
         error = ?,
         updated_at = ?,
         processed_at = ?
     WHERE id = ?`
  ).run(errorMessage, nowIso(), nowIso(), jobId);
  addJobEvent(jobId, "job.failed", { error: errorMessage });
}

export function upsertArtifact(jobId: string, kind: ArtifactKind, path: string): void {
  const db = getDb();
  db.prepare(
    `INSERT INTO job_artifacts (id, job_id, kind, path, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(job_id, kind)
     DO UPDATE SET path = excluded.path, created_at = excluded.created_at`
  ).run(randomUUID(), jobId, kind, path, nowIso());
}

export function getArtifactPath(jobId: string, kind: ArtifactKind): string | null {
  const db = getDb();
  const row = db
    .prepare("SELECT path FROM job_artifacts WHERE job_id = ? AND kind = ?")
    .get(jobId, kind) as { path: string } | undefined;
  return row?.path ?? null;
}

export function getAdminMetrics(): {
  totalUsers: number;
  totalJobs: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  expiredJobs: number;
  processedLast24Hours: number;
} {
  const db = getDb();
  const count = (sql: string, ...params: unknown[]): number => {
    const row = db.prepare(sql).get(...params) as { value: number } | undefined;
    return row?.value ?? 0;
  };
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  return {
    totalUsers: count("SELECT COUNT(*) AS value FROM users"),
    totalJobs: count("SELECT COUNT(*) AS value FROM jobs"),
    queuedJobs: count("SELECT COUNT(*) AS value FROM jobs WHERE status = 'queued'"),
    processingJobs: count("SELECT COUNT(*) AS value FROM jobs WHERE status = 'processing'"),
    completedJobs: count("SELECT COUNT(*) AS value FROM jobs WHERE status = 'completed'"),
    failedJobs: count("SELECT COUNT(*) AS value FROM jobs WHERE status = 'failed'"),
    expiredJobs: count("SELECT COUNT(*) AS value FROM jobs WHERE status = 'expired'"),
    processedLast24Hours: count("SELECT COUNT(*) AS value FROM jobs WHERE processed_at >= ?", since)
  };
}

export function listExpiredArtifacts(cutoffIso: string): Array<{ jobId: string; kind: ArtifactKind; path: string }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT job_artifacts.job_id AS jobId, job_artifacts.kind AS kind, job_artifacts.path AS path
       FROM jobs
       INNER JOIN job_artifacts ON jobs.id = job_artifacts.job_id
       WHERE jobs.expires_at <= ?`
    )
    .all(cutoffIso) as Array<{ jobId: string; kind: ArtifactKind; path: string }>;
  return rows;
}

export function listExpiredJobIds(cutoffIso: string): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT id
       FROM jobs
       WHERE expires_at <= ?`
    )
    .all(cutoffIso) as Array<{ id: string }>;
  return rows.map((row) => row.id);
}

export function expireJobs(cutoffIso: string): number {
  const db = getDb();
  const result = db
    .prepare(
      `UPDATE jobs
       SET status = 'expired',
           updated_at = ?
       WHERE expires_at <= ?
         AND status IN ('queued', 'processing', 'completed', 'failed')`
    )
    .run(nowIso(), cutoffIso);
  return result.changes;
}

export function deleteArtifactsForExpiredJobs(cutoffIso: string): number {
  const db = getDb();
  const result = db
    .prepare(
      `DELETE FROM job_artifacts
       WHERE job_id IN (SELECT id FROM jobs WHERE expires_at <= ?)`
    )
    .run(cutoffIso);
  return result.changes;
}
