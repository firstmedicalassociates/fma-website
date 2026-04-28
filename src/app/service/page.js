import { notFound } from "next/navigation";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { prisma } from "../lib/prisma";
import { SERVICE_SELECT } from "../lib/services";
import ServiceDetailTemplate from "./service-detail-template";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  title: "Service",
  description: "Detailed clinical service information from First Medical Associates.",
};

export default async function ServiceRootPage() {
  const service =
    (await prisma.service.findFirst({
      where: {
        isActive: true,
        slug: "primary-care",
      },
      select: SERVICE_SELECT,
    })) ||
    (await prisma.service.findFirst({
      where: {
        isActive: true,
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { title: "asc" }],
      select: SERVICE_SELECT,
    }));

  if (!service) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <ServiceDetailTemplate service={service} />
      <SiteFooter />
    </>
  );
}
