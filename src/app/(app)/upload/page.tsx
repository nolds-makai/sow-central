import UploadForm from "@/components/upload-form";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Upload SOW</h1>
      <p className="mt-1 text-sm text-neutral-600">
        Drop in a Statement of Work PDF. Anthropic will extract the engagement metadata, workstreams, phases, and deliverables.
      </p>
      <div className="mt-8">
        <UploadForm />
      </div>
    </div>
  );
}
