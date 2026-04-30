import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function fmtDate(date: Date | null): string {
  if (!date) return "—";
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const sows = await prisma.sow.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      clientName: true,
      engagementName: true,
      startDate: true,
      endDate: true,
      totalValue: true,
      createdAt: true,
      uploadedBy: { select: { email: true, name: true } },
      workstreams: {
        select: {
          phases: {
            select: {
              deliverables: { select: { id: true, completed: true } },
            },
          },
        },
      },
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Statements of Work</h1>
        <Link
          href="/upload"
          className="rounded-lg bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Upload SOW
        </Link>
      </div>

      {sows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-12 text-center">
          <p className="text-neutral-600">No SOWs uploaded yet.</p>
          <Link href="/upload" className="mt-3 inline-block text-sm font-medium text-neutral-900 underline">
            Upload your first SOW
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sows.map((sow) => {
            const all = sow.workstreams.flatMap((w) =>
              w.phases.flatMap((p) => p.deliverables),
            );
            const total = all.length;
            const done = all.filter((d) => d.completed).length;
            const pct = total === 0 ? 0 : Math.round((done / total) * 100);

            return (
              <Link
                key={sow.id}
                href={`/sow/${sow.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-base font-semibold tracking-tight">{sow.title}</h2>
                    {sow.clientName ? (
                      <p className="truncate text-sm text-neutral-600">{sow.clientName}</p>
                    ) : null}
                  </div>
                  {sow.totalValue ? (
                    <span className="shrink-0 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      {sow.totalValue}
                    </span>
                  ) : null}
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-y-1 text-xs text-neutral-600">
                  <dt>Engagement</dt>
                  <dd className="text-right text-neutral-900 truncate">{sow.engagementName ?? "—"}</dd>
                  <dt>Start</dt>
                  <dd className="text-right text-neutral-900">{fmtDate(sow.startDate)}</dd>
                  <dt>End</dt>
                  <dd className="text-right text-neutral-900">{fmtDate(sow.endDate)}</dd>
                </dl>

                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-neutral-600">
                    <span>{done} / {total} deliverables</span>
                    <span className="font-medium text-neutral-900">{pct}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full bg-neutral-900 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <p className="mt-4 text-xs text-neutral-500">
                  Uploaded {sow.createdAt.toISOString().slice(0, 10)}
                  {sow.uploadedBy?.name ? ` by ${sow.uploadedBy.name}` : ""}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
