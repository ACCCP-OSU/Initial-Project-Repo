import { TopNav } from "@/components/top-nav";
import { requirePageAdmin } from "@/lib/auth/guards";
import { getAdminMetrics } from "@/lib/repositories";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requirePageAdmin();
  const metrics = getAdminMetrics();

  return (
    <>
      <TopNav user={user} />
      <section className="hero">
        <h1>Admin Metrics (Read-Only)</h1>
        <p>Operational overview for pilot monitoring. This dashboard does not expose user file contents.</p>
      </section>

      <section className="card">
        <table>
          <tbody>
            <tr>
              <th>Total users</th>
              <td>{metrics.totalUsers}</td>
            </tr>
            <tr>
              <th>Total jobs</th>
              <td>{metrics.totalJobs}</td>
            </tr>
            <tr>
              <th>Queued</th>
              <td>{metrics.queuedJobs}</td>
            </tr>
            <tr>
              <th>Processing</th>
              <td>{metrics.processingJobs}</td>
            </tr>
            <tr>
              <th>Completed</th>
              <td>{metrics.completedJobs}</td>
            </tr>
            <tr>
              <th>Failed</th>
              <td>{metrics.failedJobs}</td>
            </tr>
            <tr>
              <th>Expired</th>
              <td>{metrics.expiredJobs}</td>
            </tr>
            <tr>
              <th>Processed in last 24h</th>
              <td>{metrics.processedLast24Hours}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </>
  );
}
