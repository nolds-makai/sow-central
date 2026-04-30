import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractSow } from "@/lib/extract";
import { savePdf } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 300;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  let extraction;
  try {
    extraction = await extractSow(bytes);
  } catch (err) {
    console.error("Extraction failed:", err);
    return NextResponse.json(
      { error: "Extraction failed", detail: (err as Error).message },
      { status: 502 },
    );
  }

  const { metadata, workstreams } = extraction;

  // Create everything in one transaction so an error doesn't leave partial state.
  const sow = await prisma.$transaction(async (tx) => {
    const created = await tx.sow.create({
      data: {
        title: metadata.title,
        clientName: metadata.client_name,
        engagementName: metadata.engagement_name,
        startDate: parseDate(metadata.start_date),
        endDate: parseDate(metadata.end_date),
        totalValue: metadata.total_value,
        currency: metadata.currency,
        parties: metadata.parties,
        contractNumber: metadata.contract_number,
        effectiveDate: parseDate(metadata.effective_date),
        signedDate: parseDate(metadata.signed_date),
        primaryContactClient: metadata.primary_contact_client,
        primaryContactMakai: metadata.primary_contact_makai,
        paymentTerms: metadata.payment_terms,
        summary: metadata.summary,
        pdfFilename: file.name,
        pdfPath: "", // filled after save
        uploadedById: session.user!.id,
      },
    });

    // Track external_id → DB id so we can wire up dependencies after insert.
    const idMap = new Map<string, string>();
    const dependencyEdges: Array<{ from: string; to: string }> = [];

    for (const [wIdx, ws] of workstreams.entries()) {
      const workstream = await tx.workstream.create({
        data: {
          sowId: created.id,
          name: ws.name,
          description: ws.description,
          order: wIdx,
        },
      });

      for (const [pIdx, ph] of ws.phases.entries()) {
        const phase = await tx.phase.create({
          data: {
            workstreamId: workstream.id,
            name: ph.name,
            description: ph.description,
            startDate: parseDate(ph.start_date),
            endDate: parseDate(ph.end_date),
            order: pIdx,
          },
        });

        for (const [dIdx, dv] of ph.deliverables.entries()) {
          const deliverable = await tx.deliverable.create({
            data: {
              phaseId: phase.id,
              title: dv.title,
              description: dv.description,
              acceptanceCriteria: dv.acceptance_criteria,
              dueDate: parseDate(dv.due_date),
              order: dIdx,
            },
          });
          idMap.set(dv.external_id, deliverable.id);
          for (const dep of dv.depends_on) {
            dependencyEdges.push({ from: dv.external_id, to: dep });
          }
        }
      }
    }

    for (const edge of dependencyEdges) {
      const fromId = idMap.get(edge.from);
      const toId = idMap.get(edge.to);
      if (!fromId || !toId) continue; // dropped — invalid external_id reference
      await tx.deliverable.update({
        where: { id: fromId },
        data: { dependsOn: { connect: { id: toId } } },
      });
    }

    return created;
  }, { timeout: 60_000 });

  // Persist the PDF to the volume now that we have an ID.
  const pdfPath = await savePdf(sow.id, bytes);
  await prisma.sow.update({ where: { id: sow.id }, data: { pdfPath } });

  return NextResponse.json({ id: sow.id }, { status: 201 });
}
