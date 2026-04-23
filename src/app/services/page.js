import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { prisma } from "../lib/prisma";
import ServicesDirectory from "./services-directory";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  title: "Services",
  description: "Browse all clinical services offered by First Medical Associates.",
};

export default async function ServicesPage() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
    select: {
      id: true,
      category: true,
      title: true,
      description: true,
      icon: true,
    },
  });

  return (
    <>
      <SiteHeader />
      <ServicesDirectory services={services} />
      <SiteFooter />
    </>
  );
}
