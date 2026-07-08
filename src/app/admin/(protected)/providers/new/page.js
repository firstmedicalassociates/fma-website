import { prisma } from "../../../../lib/prisma";
import { VISIBLE_LOCATION_WHERE } from "../../../../lib/locations";
import ProviderForm from "../provider-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewProviderPage() {
  const locations = await prisma.location.findMany({
    where: VISIBLE_LOCATION_WHERE,
    orderBy: { title: "asc" },
    select: {
      slug: true,
      title: true,
    },
  });

  return <ProviderForm mode="create" locationOptions={locations} />;
}
