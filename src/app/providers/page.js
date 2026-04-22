import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { prisma } from "../lib/prisma";
import { buildLocationTitleMap, mapProviderForDirectory } from "../lib/providers";
import ProvidersDirectory from "./providers-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Providers",
  description: "Browse providers by location and language.",
};

export default async function ProvidersPage() {
  const [providers, locations] = await Promise.all([
    prisma.provider.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        title: true,
        bio: true,
        imageUrl: true,
        imageAlt: true,
        locations: true,
        languages: true,
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

  const locationTitleBySlug = buildLocationTitleMap(locations);

  return (
    <>
      <SiteHeader />
      <ProvidersDirectory
        providers={providers.map((provider) => mapProviderForDirectory(provider, locationTitleBySlug))}
      />
      <SiteFooter />
    </>
  );
}
