import { prisma } from "../../../../lib/prisma";
import LocationForm from "../location-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewLocationPage() {
  const serviceOptions = await prisma.service.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      isActive: true,
    },
  });

  return <LocationForm mode="create" serviceOptions={serviceOptions} />;
}
