import { prisma } from "../../../../lib/prisma";
import ProviderForm from "../provider-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewProviderPage() {
  const locations = await prisma.location.findMany({
    orderBy: { title: "asc" },
    select: {
      slug: true,
      title: true,
    },
  });

  return <ProviderForm mode="create" locationOptions={locations} />;
}
