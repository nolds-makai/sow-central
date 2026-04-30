"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function UploadForm() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/sow", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.detail || body?.error || `Upload failed (${res.status})`);
        setSubmitting(false);
        return;
      }
      router.push(`/sow/${body.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <label
        htmlFor="file"
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-16 text-center transition ${
          submitting
            ? "border-neutral-200 bg-neutral-50"
            : "cursor-pointer border-neutral-300 bg-white hover:border-neutral-400"
        }`}
      >
        <span className="text-sm font-medium text-neutral-900">
          {file ? file.name : "Click to choose a PDF"}
        </span>
        <span className="mt-1 text-xs text-neutral-500">
          {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "PDF only"}
        </span>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          className="hidden"
          disabled={submitting}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
        />
      </label>

      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      {submitting ? (
        <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          Extracting workstreams, phases, and deliverables. This usually takes 30–90 seconds — keep this tab open.
        </div>
      ) : null}

      <button
        type="submit"
        disabled={!file || submitting}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {submitting ? "Extracting…" : "Upload and extract"}
      </button>
    </form>
  );
}
