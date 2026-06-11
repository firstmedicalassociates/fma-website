import { Inter } from "next/font/google";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { prisma } from "../lib/prisma";
import { servicesIndexMetadata } from "../lib/seo";
import ServicesDirectory from "./services-directory";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = servicesIndexMetadata;

const inter = Inter({ subsets: ["latin"] });

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      slug: true,
      category: true,
      title: true,
      description: true,
      icon: true,
    },
  });

  return (
    <>
      <SiteHeader />
      <div className={inter.className}>
        <ServicesDirectory services={services} />
      </div>
      <SiteFooter />
    </>
  );
}
