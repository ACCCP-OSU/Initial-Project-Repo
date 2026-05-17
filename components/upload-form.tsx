"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UploadResponse = {
  job_id: string;
  status: string;
  deduplicated: boolean;
};

export function UploadForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Upload failed.");
      }
      const payload = (await response.json()) as UploadResponse;
      form.reset();
      router.push(`/jobs/${payload.job_id}`);
      router.refresh();
    } catch (submissionError) {
      const message = submissionError instanceof Error ? submissionError.message : "Upload failed.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="file">
        DOCX file
        <input id="file" name="file" type="file" accept=".docx" required />
      </label>
      <div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Uploading..." : "Upload & Queue Conversion"}
        </button>
      </div>
      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
