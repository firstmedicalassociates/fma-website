import { notFound } from "next/navigation";
import { prisma } from "../../../../../lib/prisma";
import ProviderForm from "../../provider-form";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function EditProviderPage({ params }) {
  const { id } = await params;
  if (!id) {
    notFound();
  }

  const provider = await prisma.provider.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      title: true,
      slug: true,
      bio: true,
      imageUrl: true,
      linkUrl: true,
      locations: true,
      languages: true,
    },
  });

  if (!provider) {
    notFound();
  }

  return <ProviderForm mode="edit" initialProvider={provider} />;
}
