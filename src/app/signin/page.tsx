import { signIn } from "@/auth";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { callbackUrl, error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">SOW Central</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Internal Makai Labs tool. Sign in with your{" "}
          <span className="font-mono">@makailabs.ai</span> Google account.
        </p>

        {error ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error === "AccessDenied" ? (
              <>Sign-in was rejected. Make sure you're using your <span className="font-mono">@makailabs.ai</span> account.</>
            ) : error === "Configuration" ? (
              <>Server configuration error. Check that <span className="font-mono">DATABASE_URL</span> is set and migrations have run.</>
            ) : (
              <>Sign-in failed: <span className="font-mono">{error}</span></>
            )}
          </div>
        ) : null}

        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: callbackUrl ?? "/dashboard" });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Continue with Google
          </button>
        </form>
      </div>
    </main>
  );
}
