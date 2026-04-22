import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import ServiceForm from "../service-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditServicePage({ params }) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const service = await prisma.service.findUnique({
    where: { id },
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      sortOrder: true,
      isActive: true,
    },
  });

  if (!service) {
    notFound();
  }

  return <ServiceForm mode="edit" initialService={service} />;
}
