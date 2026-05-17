import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { TopNav } from "@/components/top-nav";
import { UploadForm } from "@/components/upload-form";
import { requirePageUser } from "@/lib/auth/guards";
import { listJobsForUser } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requirePageUser();
  const jobs = listJobsForUser(user.id);

  return (
    <>
      <TopNav user={user} />
      <section className="hero">
        <h1>Upload DOCX for Conversion</h1>
        <p>
          Upload a Word document to start an asynchronous conversion job. You remain responsible for reviewing the generated HTML before publishing in Canvas.
        </p>
        <UploadForm />
      </section>

      <section className="card">
        <h2>Recent Jobs</h2>
        {jobs.length === 0 ? (
          <p className="muted">No jobs yet. Upload a DOCX file to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job ID</th>
                <th>Filename</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.id.slice(0, 8)}</td>
                  <td>{job.sourceFilename}</td>
                  <td>
                    <StatusPill status={job.status} />
                  </td>
                  <td>{new Date(job.updatedAt).toLocaleString()}</td>
                  <td>
                    <Link href={`/jobs/${job.id}`}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
