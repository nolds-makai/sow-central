import Link from "next/link";
import { auth, signOut } from "@/auth";

export default async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-base font-semibold tracking-tight">
            SOW Central
          </Link>
          <nav className="flex items-center gap-4 text-sm text-neutral-600">
            <Link href="/dashboard" className="hover:text-neutral-900">Dashboard</Link>
            <Link href="/upload" className="hover:text-neutral-900">Upload</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {session?.user?.email ? (
            <span className="text-neutral-600">{session.user.email}</span>
          ) : null}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/signin" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-neutral-200 px-2.5 py-1 text-neutral-700 transition hover:bg-neutral-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
