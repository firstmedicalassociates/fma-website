import { prisma } from "../lib/prisma";
import { mapProviderForDirectory } from "../lib/providers";
import ProvidersDirectory from "./providers-directory";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  title: "Providers",
  description: "Browse providers by location and language.",
};

export default async function ProvidersPage() {
  const providers = await prisma.provider.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      title: true,
      bio: true,
      imageUrl: true,
      locations: true,
      languages: true,
    },
  });

  return <ProvidersDirectory providers={providers.map(mapProviderForDirectory)} />;
}
