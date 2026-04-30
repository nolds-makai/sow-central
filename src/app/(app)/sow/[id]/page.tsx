import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SowDetail from "@/components/sow-detail";

export const dynamic = "force-dynamic";

export default async function SowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const sow = await prisma.sow.findUnique({
    where: { id },
    include: {
      uploadedBy: { select: { name: true, email: true } },
      workstreams: {
        orderBy: { order: "asc" },
        include: {
          phases: {
            orderBy: { order: "asc" },
            include: {
              deliverables: {
                orderBy: { order: "asc" },
                include: {
                  dependsOn: { select: { id: true, title: true } },
                  dependedOnBy: { select: { id: true, title: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!sow) notFound();

  return <SowDetail sow={sow} />;
}
