import { Inter } from "next/font/google";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { prisma } from "../lib/prisma";
import { buildLocationTitleMap, mapProviderForDirectory } from "../lib/providers";
import { providersIndexMetadata } from "../lib/seo";
import ProvidersDirectory from "./providers-directory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = providersIndexMetadata;

const inter = Inter({ subsets: ["latin"] });

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
      <div className={inter.className}>
        <ProvidersDirectory
          providers={providers.map((provider) => mapProviderForDirectory(provider, locationTitleBySlug))}
        />
      </div>
      <SiteFooter />
    </>
  );
}
