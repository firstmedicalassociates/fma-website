import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";
import SiteHeader from "../../components/site-header";
import { prisma } from "../../lib/prisma";
import { SERVICE_SELECT } from "../../lib/services";
import ServiceDetailTemplate from "../service-detail-template";

export const runtime = "nodejs";
export const revalidate = 60;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const service = await prisma.service.findFirst({
    where: {
      slug,
      isActive: true,
    },
    select: {
      title: true,
      description: true,
    },
  });

  if (!service) {
    return {
      title: "Service",
      description: "Detailed clinical service information from First Medical Associates.",
    };
  }

  return {
    title: service.title,
    description: service.description,
  };
}

export default async function ServiceDetailPage({ params }) {
  const { slug } = await params;

  const service = await prisma.service.findFirst({
    where: {
      slug,
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    select: SERVICE_SELECT,
  });

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
