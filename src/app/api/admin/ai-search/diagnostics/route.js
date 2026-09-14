import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { getAthenaProviderMappingCoverage } from "../../../../lib/athena-availability";
import { prisma } from "../../../../lib/prisma";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const [coverage, providers] = await Promise.all([
    getAthenaProviderMappingCoverage(),
    prisma.provider.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        linkUrl: true,
        locations: true,
        languages: true,
        athenaProviderId: true,
        athenaDepartmentId: true,
        athenaSchedulingName: true,
      },
    }),
  ]);
  const gaps = providers
    .map((provider) => ({
      name: provider.name,
      gaps: [
        !provider.linkUrl && "Missing booking URL",
        !provider.locations.length && "Missing locations",
        !provider.languages.length && "Missing languages",
        !provider.athenaProviderId &&
          !provider.athenaSchedulingName &&
          "Missing scheduling match",
        !provider.athenaDepartmentId && "Missing scheduling department",
      ].filter(Boolean),
    }))
    .filter((row) => row.gaps.length);
  return NextResponse.json({
    ok: true,
    coverage,
    gaps,
    checkedAt: new Date().toISOString(),
  });
}
