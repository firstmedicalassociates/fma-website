import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import { LOCATION_FORM_SELECT } from "../../../../lib/location-cms";
import LocationForm from "../location-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditLocationPage({ params }) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const [location, serviceOptions] = await Promise.all([
    prisma.location.findUnique({
      where: { id },
      select: LOCATION_FORM_SELECT,
    }),
    prisma.service.findMany({
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { title: "asc" }],
      select: {
        id: true,
        category: true,
        title: true,
        description: true,
        sortOrder: true,
        isActive: true,
      },
    }),
  ]);

  if (!location) {
    notFound();
  }

  const assignedProviderCount = await prisma.provider.count({
    where: {
      locations: {
        has: location.slug,
      },
    },
  });

  return (
    <LocationForm
      mode="edit"
      initialLocation={location}
      assignedProviderCount={assignedProviderCount}
      serviceOptions={serviceOptions}
    />
  );
}
