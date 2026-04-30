"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  toggleDeliverable,
  updateDeliverable,
  addDeliverable,
  deleteDeliverable,
  updateSowMetadata,
  deleteSow,
} from "@/lib/actions";

// ───────── Types ─────────

type DeliverableData = {
  id: string;
  title: string;
  description: string | null;
  acceptanceCriteria: string | null;
  dueDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  dependsOn: { id: string; title: string }[];
  dependedOnBy: { id: string; title: string }[];
};

type PhaseData = {
  id: string;
  name: string;
  description: string | null;
  startDate: Date | null;
  endDate: Date | null;
  deliverables: DeliverableData[];
};

type WorkstreamData = {
  id: string;
  name: string;
  description: string | null;
  phases: PhaseData[];
};

type SowData = {
  id: string;
  title: string;
  clientName: string | null;
  engagementName: string | null;
  startDate: Date | null;
  endDate: Date | null;
  totalValue: string | null;
  currency: string | null;
  parties: string[];
  contractNumber: string | null;
  effectiveDate: Date | null;
  signedDate: Date | null;
  primaryContactClient: string | null;
  primaryContactMakai: string | null;
  paymentTerms: string | null;
  summary: string | null;
  pdfFilename: string;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string } | null;
  workstreams: WorkstreamData[];
};

// ───────── Helpers ─────────

function fmtDate(d: Date | null | undefined): string {
  if (!d) return "—";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().slice(0, 10);
}

function dateInputValue(d: Date | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

// ───────── Main component ─────────

export default function SowDetail({ sow }: { sow: SowData }) {
  const allDeliverables = sow.workstreams.flatMap((w) => w.phases.flatMap((p) => p.deliverables));
  const total = allDeliverables.length;
  const done = allDeliverables.filter((d) => d.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <Link href="/dashboard" className="text-xs text-neutral-500 hover:text-neutral-900">
            ← All SOWs
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{sow.title}</h1>
          {sow.clientName ? (
            <p className="mt-1 text-sm text-neutral-600">{sow.clientName}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href={`/api/sow/${sow.id}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 transition hover:bg-neutral-100"
          >
            View PDF
          </a>
          <DeleteSowButton sowId={sow.id} />
        </div>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="tabular-nums text-neutral-600">{done} / {total} ({pct}%)</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div className="h-full bg-neutral-900 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <MetadataPanel sow={sow} />

      <div className="space-y-6">
        {sow.workstreams.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-600">
            Extraction returned no workstreams.
          </div>
        ) : (
          sow.workstreams.map((ws) => <WorkstreamSection key={ws.id} workstream={ws} />)
        )}
      </div>
    </div>
  );
}

// ───────── Metadata ─────────

function MetadataPanel({ sow }: { sow: SowData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [draft, setDraft] = useState({
    title: sow.title,
    clientName: sow.clientName ?? "",
    engagementName: sow.engagementName ?? "",
    startDate: dateInputValue(sow.startDate),
    endDate: dateInputValue(sow.endDate),
    totalValue: sow.totalValue ?? "",
    currency: sow.currency ?? "",
    contractNumber: sow.contractNumber ?? "",
    effectiveDate: dateInputValue(sow.effectiveDate),
    signedDate: dateInputValue(sow.signedDate),
    primaryContactClient: sow.primaryContactClient ?? "",
    primaryContactMakai: sow.primaryContactMakai ?? "",
    paymentTerms: sow.paymentTerms ?? "",
    summary: sow.summary ?? "",
  });

  function save() {
    startTransition(async () => {
      await updateSowMetadata(sow.id, {
        title: draft.title,
        clientName: draft.clientName || null,
        engagementName: draft.engagementName || null,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        totalValue: draft.totalValue || null,
        currency: draft.currency || null,
        contractNumber: draft.contractNumber || null,
        effectiveDate: draft.effectiveDate || null,
        signedDate: draft.signedDate || null,
        primaryContactClient: draft.primaryContactClient || null,
        primaryContactMakai: draft.primaryContactMakai || null,
        paymentTerms: draft.paymentTerms || null,
        summary: draft.summary || null,
      });
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold">Edit metadata</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Title"><input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
          <Field label="Client"><input className={inputCls} value={draft.clientName} onChange={(e) => setDraft({ ...draft, clientName: e.target.value })} /></Field>
          <Field label="Engagement"><input className={inputCls} value={draft.engagementName} onChange={(e) => setDraft({ ...draft, engagementName: e.target.value })} /></Field>
          <Field label="Total value"><input className={inputCls} value={draft.totalValue} onChange={(e) => setDraft({ ...draft, totalValue: e.target.value })} /></Field>
          <Field label="Currency"><input className={inputCls} value={draft.currency} onChange={(e) => setDraft({ ...draft, currency: e.target.value })} /></Field>
          <Field label="Contract #"><input className={inputCls} value={draft.contractNumber} onChange={(e) => setDraft({ ...draft, contractNumber: e.target.value })} /></Field>
          <Field label="Start date"><input type="date" className={inputCls} value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} /></Field>
          <Field label="End date"><input type="date" className={inputCls} value={draft.endDate} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} /></Field>
          <Field label="Effective date"><input type="date" className={inputCls} value={draft.effectiveDate} onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })} /></Field>
          <Field label="Signed date"><input type="date" className={inputCls} value={draft.signedDate} onChange={(e) => setDraft({ ...draft, signedDate: e.target.value })} /></Field>
          <Field label="Primary contact (client)"><input className={inputCls} value={draft.primaryContactClient} onChange={(e) => setDraft({ ...draft, primaryContactClient: e.target.value })} /></Field>
          <Field label="Primary contact (Makai)"><input className={inputCls} value={draft.primaryContactMakai} onChange={(e) => setDraft({ ...draft, primaryContactMakai: e.target.value })} /></Field>
          <Field label="Payment terms" full><textarea rows={3} className={inputCls} value={draft.paymentTerms} onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })} /></Field>
          <Field label="Summary" full><textarea rows={3} className={inputCls} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} /></Field>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button onClick={save} disabled={pending} className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-300">
            {pending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} disabled={pending} className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Engagement metadata</h2>
        <button onClick={() => setEditing(true)} className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
          Edit
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 md:grid-cols-3">
        <Row label="Engagement" value={sow.engagementName} />
        <Row label="Total value" value={sow.totalValue} />
        <Row label="Currency" value={sow.currency} />
        <Row label="Start" value={fmtDate(sow.startDate)} />
        <Row label="End" value={fmtDate(sow.endDate)} />
        <Row label="Contract #" value={sow.contractNumber} />
        <Row label="Effective" value={fmtDate(sow.effectiveDate)} />
        <Row label="Signed" value={fmtDate(sow.signedDate)} />
        <Row label="Client contact" value={sow.primaryContactClient} />
        <Row label="Makai contact" value={sow.primaryContactMakai} />
      </div>
      {sow.parties.length > 0 ? (
        <div className="mt-4 text-sm">
          <span className="text-neutral-500">Parties: </span>
          <span>{sow.parties.join(", ")}</span>
        </div>
      ) : null}
      {sow.paymentTerms ? (
        <div className="mt-4 text-sm">
          <div className="text-neutral-500">Payment terms</div>
          <p className="mt-0.5 whitespace-pre-wrap text-neutral-900">{sow.paymentTerms}</p>
        </div>
      ) : null}
      {sow.summary ? (
        <div className="mt-4 text-sm">
          <div className="text-neutral-500">Summary</div>
          <p className="mt-0.5 whitespace-pre-wrap text-neutral-900">{sow.summary}</p>
        </div>
      ) : null}
      <div className="mt-4 text-xs text-neutral-500">
        Uploaded {fmtDate(sow.createdAt)}
        {sow.uploadedBy ? ` by ${sow.uploadedBy.name ?? sow.uploadedBy.email}` : ""}
        {" · "}
        <span className="font-mono">{sow.pdfFilename}</span>
      </div>
    </div>
  );
}

// ───────── Workstream + Phase ─────────

function WorkstreamSection({ workstream }: { workstream: WorkstreamData }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <h2 className="text-lg font-semibold tracking-tight">{workstream.name}</h2>
      {workstream.description ? (
        <p className="mt-1 text-sm text-neutral-600">{workstream.description}</p>
      ) : null}
      <div className="mt-5 space-y-5">
        {workstream.phases.map((phase) => (
          <PhaseSection key={phase.id} phase={phase} />
        ))}
      </div>
    </section>
  );
}

function PhaseSection({ phase }: { phase: PhaseData }) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-800">{phase.name}</h3>
        <div className="text-xs text-neutral-500">
          {phase.startDate || phase.endDate
            ? `${fmtDate(phase.startDate)} → ${fmtDate(phase.endDate)}`
            : null}
        </div>
      </div>
      {phase.description ? (
        <p className="mt-0.5 text-sm text-neutral-600">{phase.description}</p>
      ) : null}
      <ul className="mt-3 space-y-1.5">
        {phase.deliverables.map((d) => (
          <DeliverableItem key={d.id} deliverable={d} />
        ))}
      </ul>
      {adding ? (
        <AddDeliverableForm phaseId={phase.id} onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="mt-2 text-xs font-medium text-neutral-500 hover:text-neutral-900"
        >
          + Add deliverable
        </button>
      )}
    </div>
  );
}

// ───────── Deliverable row ─────────

function DeliverableItem({ deliverable: d }: { deliverable: DeliverableData }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({
    title: d.title,
    description: d.description ?? "",
    acceptanceCriteria: d.acceptanceCriteria ?? "",
    dueDate: dateInputValue(d.dueDate),
  });

  function toggle() {
    startTransition(() => toggleDeliverable(d.id));
  }

  function save() {
    startTransition(async () => {
      await updateDeliverable(d.id, {
        title: draft.title,
        description: draft.description || null,
        acceptanceCriteria: draft.acceptanceCriteria || null,
        dueDate: draft.dueDate || null,
      });
      setEditing(false);
    });
  }

  function remove() {
    if (!confirm(`Delete "${d.title}"?`)) return;
    startTransition(() => deleteDeliverable(d.id));
  }

  if (editing) {
    return (
      <li className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="space-y-2">
          <input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Title" />
          <textarea rows={2} className={inputCls} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" />
          <textarea rows={2} className={inputCls} value={draft.acceptanceCriteria} onChange={(e) => setDraft({ ...draft, acceptanceCriteria: e.target.value })} placeholder="Acceptance criteria" />
          <input type="date" className={inputCls} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button onClick={save} disabled={pending} className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-300">
            {pending ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} disabled={pending} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100">
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="group rounded-lg border border-neutral-100 px-3 py-2 hover:border-neutral-200 hover:bg-neutral-50">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={d.completed}
          disabled={pending}
          onChange={toggle}
          className="mt-1 h-4 w-4 cursor-pointer rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className={`text-sm ${d.completed ? "text-neutral-400 line-through" : "text-neutral-900"}`}>
              {d.title}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-neutral-500">
              {d.dueDate ? `Due ${fmtDate(d.dueDate)}` : null}
            </span>
          </div>
          {d.description ? (
            <p className="mt-0.5 text-xs text-neutral-600">{d.description}</p>
          ) : null}
          {d.acceptanceCriteria ? (
            <p className="mt-1 text-xs text-neutral-500">
              <span className="font-medium">Acceptance: </span>
              {d.acceptanceCriteria}
            </p>
          ) : null}
          {d.dependsOn.length > 0 || d.dependedOnBy.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
              {d.dependsOn.map((dep) => (
                <span key={dep.id} className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
                  Depends on: {dep.title}
                </span>
              ))}
              {d.dependedOnBy.map((dep) => (
                <span key={dep.id} className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800">
                  Blocks: {dep.title}
                </span>
              ))}
            </div>
          ) : null}
          <div className="mt-1.5 flex items-center gap-3 text-xs opacity-0 transition group-hover:opacity-100">
            <button onClick={() => setEditing(true)} className="text-neutral-600 hover:text-neutral-900">Edit</button>
            <button onClick={remove} className="text-red-600 hover:text-red-800">Delete</button>
          </div>
        </div>
      </div>
    </li>
  );
}

function AddDeliverableForm({ phaseId, onDone }: { phaseId: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const [draft, setDraft] = useState({ title: "", description: "", dueDate: "" });

  function submit() {
    if (!draft.title.trim()) return;
    startTransition(async () => {
      await addDeliverable(phaseId, {
        title: draft.title.trim(),
        description: draft.description || null,
        dueDate: draft.dueDate || null,
      });
      onDone();
    });
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
      <input className={inputCls} placeholder="Title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} autoFocus />
      <textarea rows={2} className={inputCls} placeholder="Description (optional)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
      <input type="date" className={inputCls} value={draft.dueDate} onChange={(e) => setDraft({ ...draft, dueDate: e.target.value })} />
      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={pending || !draft.title.trim()} className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:bg-neutral-300">
          {pending ? "Adding…" : "Add"}
        </button>
        <button onClick={onDone} disabled={pending} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ───────── Delete SOW ─────────

function DeleteSowButton({ sowId }: { sowId: string }) {
  const [pending, startTransition] = useTransition();

  function handle() {
    if (!confirm("Delete this SOW and its PDF? This cannot be undone.")) return;
    startTransition(() => deleteSow(sowId));
  }

  return (
    <button
      onClick={handle}
      disabled={pending}
      className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

// ───────── Tiny atoms ─────────

const inputCls =
  "block w-full rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-sm shadow-sm focus:border-neutral-900 focus:outline-none focus:ring-0";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block text-sm ${full ? "md:col-span-2" : ""}`}>
      <span className="mb-1 block text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-neutral-500">{label}</div>
      <div className="truncate text-neutral-900">{value || "—"}</div>
    </div>
  );
}
