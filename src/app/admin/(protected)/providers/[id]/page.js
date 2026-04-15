import { notFound } from "next/navigation";
import { prisma } from "../../../../lib/prisma";
import ProviderForm from "../provider-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditProviderPage({ params }) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const [provider, locations] = await Promise.all([
    prisma.provider.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        title: true,
        slug: true,
        bio: true,
        imageUrl: true,
        imageAlt: true,
        linkUrl: true,
        locations: true,
        languages: true,
        sortOrder: true,
        isActive: true,
      },
    }),
    prisma.location.findMany({
      orderBy: { title: "asc" },
      select: {
        slug: true,
        title: true,
      },
    }),
  ]);

  if (!provider) {
    notFound();
  }

  return <ProviderForm mode="edit" initialProvider={provider} locationOptions={locations} />;
}
