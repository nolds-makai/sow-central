"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { deletePdf } from "@/lib/storage";

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ───────── Deliverables ─────────

export async function toggleDeliverable(deliverableId: string) {
  const userId = await requireUser();

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { id: true, completed: true, phase: { select: { workstream: { select: { sowId: true } } } } },
  });
  if (!deliverable) throw new Error("Deliverable not found");

  const next = !deliverable.completed;
  await prisma.$transaction([
    prisma.deliverable.update({
      where: { id: deliverableId },
      data: {
        completed: next,
        completedAt: next ? new Date() : null,
        completedById: next ? userId : null,
      },
    }),
    prisma.deliverableToggle.create({
      data: { deliverableId, userId, completed: next },
    }),
  ]);

  revalidatePath(`/sow/${deliverable.phase.workstream.sowId}`);
}

export async function updateDeliverable(
  deliverableId: string,
  data: {
    title?: string;
    description?: string | null;
    acceptanceCriteria?: string | null;
    dueDate?: string | null;
  },
) {
  await requireUser();

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { phase: { select: { workstream: { select: { sowId: true } } } } },
  });
  if (!deliverable) throw new Error("Deliverable not found");

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.acceptanceCriteria !== undefined ? { acceptanceCriteria: data.acceptanceCriteria } : {}),
      ...(data.dueDate !== undefined ? { dueDate: parseDate(data.dueDate) } : {}),
    },
  });

  revalidatePath(`/sow/${deliverable.phase.workstream.sowId}`);
}

export async function addDeliverable(
  phaseId: string,
  data: { title: string; description?: string | null; dueDate?: string | null },
) {
  await requireUser();

  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { workstream: { select: { sowId: true } }, deliverables: { select: { order: true } } },
  });
  if (!phase) throw new Error("Phase not found");

  const nextOrder = phase.deliverables.reduce((max, d) => Math.max(max, d.order + 1), 0);

  await prisma.deliverable.create({
    data: {
      phaseId,
      title: data.title,
      description: data.description ?? null,
      dueDate: parseDate(data.dueDate),
      order: nextOrder,
    },
  });

  revalidatePath(`/sow/${phase.workstream.sowId}`);
}

export async function deleteDeliverable(deliverableId: string) {
  await requireUser();

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    select: { phase: { select: { workstream: { select: { sowId: true } } } } },
  });
  if (!deliverable) throw new Error("Deliverable not found");

  await prisma.deliverable.delete({ where: { id: deliverableId } });
  revalidatePath(`/sow/${deliverable.phase.workstream.sowId}`);
}

// ───────── SOW metadata ─────────

export async function updateSowMetadata(
  sowId: string,
  data: {
    title?: string;
    clientName?: string | null;
    engagementName?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    totalValue?: string | null;
    currency?: string | null;
    contractNumber?: string | null;
    effectiveDate?: string | null;
    signedDate?: string | null;
    primaryContactClient?: string | null;
    primaryContactMakai?: string | null;
    paymentTerms?: string | null;
    summary?: string | null;
  },
) {
  await requireUser();

  await prisma.sow.update({
    where: { id: sowId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.clientName !== undefined ? { clientName: data.clientName } : {}),
      ...(data.engagementName !== undefined ? { engagementName: data.engagementName } : {}),
      ...(data.startDate !== undefined ? { startDate: parseDate(data.startDate) } : {}),
      ...(data.endDate !== undefined ? { endDate: parseDate(data.endDate) } : {}),
      ...(data.totalValue !== undefined ? { totalValue: data.totalValue } : {}),
      ...(data.currency !== undefined ? { currency: data.currency } : {}),
      ...(data.contractNumber !== undefined ? { contractNumber: data.contractNumber } : {}),
      ...(data.effectiveDate !== undefined ? { effectiveDate: parseDate(data.effectiveDate) } : {}),
      ...(data.signedDate !== undefined ? { signedDate: parseDate(data.signedDate) } : {}),
      ...(data.primaryContactClient !== undefined ? { primaryContactClient: data.primaryContactClient } : {}),
      ...(data.primaryContactMakai !== undefined ? { primaryContactMakai: data.primaryContactMakai } : {}),
      ...(data.paymentTerms !== undefined ? { paymentTerms: data.paymentTerms } : {}),
      ...(data.summary !== undefined ? { summary: data.summary } : {}),
    },
  });

  revalidatePath(`/sow/${sowId}`);
  revalidatePath("/dashboard");
}

export async function deleteSow(sowId: string) {
  await requireUser();
  await prisma.sow.delete({ where: { id: sowId } });
  await deletePdf(sowId);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
