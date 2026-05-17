import Link from "next/link";
import { redirect } from "next/navigation";

import { getPageUser } from "@/lib/auth/guards";
import { config } from "@/lib/config";

export default async function HomePage() {
  const user = await getPageUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <>
      <section className="hero">
        <h1>{config.appName}</h1>
        <p>
          Self-service DOCX conversion to accessible Canvas HTML, built for capstone delivery and institutional SSO access.
        </p>
        <p>
          Users upload a `.docx` file, processing runs asynchronously, and completed artifacts are downloaded for human review before publishing in Canvas.
        </p>
        <Link className="button" href="/login">
          Continue to SSO Login
        </Link>
      </section>
      <section className="card">
        <h2>Policy Snapshot</h2>
        <ul>
          <li>DOCX-only intake in MVP.</li>
          <li>No direct Canvas API publish in MVP.</li>
          <li>User review required before use.</li>
          <li>Artifacts retained for 30 days by default.</li>
        </ul>
      </section>
    </>
  );
}
