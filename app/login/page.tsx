import Link from "next/link";
import { redirect } from "next/navigation";

import { getPageUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getPageUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <section className="hero">
      <h1>Institutional Sign In</h1>
      <p>Authenticate with university SAML SSO to access document conversion jobs and artifacts.</p>
      <Link href="/api/auth/saml/login" className="button">
        Sign in with SSO
      </Link>
      <p className="muted" style={{ marginTop: "1rem" }}>
        If SSO is not configured yet, set the `SAML_*` environment variables before testing this flow.
      </p>
    </section>
  );
}
