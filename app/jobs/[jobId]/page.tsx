import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { TopNav } from "@/components/top-nav";
import { requirePageUser } from "@/lib/auth/guards";
import { parseWarningsJson } from "@/lib/jobs/serialization";
import { getJobForUser } from "@/lib/repositories";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export default async function JobDetailsPage({ params }: PageProps) {
  const user = await requirePageUser();
  const { jobId } = await Promise.resolve(params);
  const job = getJobForUser(jobId, user.id);
  if (!job) {
    notFound();
  }

  const warnings = parseWarningsJson(job.warningsJson);
  const canDownload = job.status === "completed";

  return (
    <>
      <TopNav user={user} />
      <section className="hero">
        <h1>Job {job.id}</h1>
        <p>
          <strong>Source:</strong> {job.sourceFilename}
        </p>
        <p>
          <strong>Status:</strong> <StatusPill status={job.status} />
        </p>
        <p>
          <strong>Model:</strong> {job.model}
        </p>
        <p>
          <strong>Prompt profile:</strong> {job.promptProfile}
        </p>
        <p className="muted">
          Created {new Date(job.createdAt).toLocaleString()} | Updated {new Date(job.updatedAt).toLocaleString()}
        </p>
        {job.error ? <p className="error">Error: {job.error}</p> : null}
        <div style={{ marginTop: "0.8rem" }}>
          <Link href="/dashboard" className="button secondary">
            Back to Dashboard
          </Link>
        </div>
      </section>

      <section className="card">
        <h2>Automated QA Warnings</h2>
        {warnings.length === 0 ? (
          <p className="muted">Warnings will appear after conversion completes.</p>
        ) : (
          warnings.map((warning) => (
            <div className={`warning ${warning.severity === "info" ? "info" : ""}`} key={`${warning.code}-${warning.message}`}>
              <strong>{warning.code}</strong>
              <div>{warning.message}</div>
            </div>
          ))
        )}
      </section>

      <section className="card">
        <h2>Artifacts</h2>
        <p className="muted">User review is required before publishing output to Canvas.</p>
        {canDownload ? (
          <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
            <Link href={`/api/jobs/${job.id}/artifacts/html`} className="button">
              Download HTML
            </Link>
            <Link href={`/api/jobs/${job.id}/artifacts/review`} className="button secondary">
              Download Review JSON
            </Link>
          </div>
        ) : (
          <p className="muted">Artifacts are available after job completion.</p>
        )}
      </section>
    </>
  );
}
