import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="hero">
      <h1>Not Found</h1>
      <p>The requested resource could not be found, or you may not have access.</p>
      <Link href="/dashboard" className="button secondary">
        Return to Dashboard
      </Link>
    </section>
  );
}
