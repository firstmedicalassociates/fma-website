import { NextResponse } from "next/server";
import { requireAdminRequest } from "../../../../lib/admin-auth";
import { getAthenaProviderMappingCoverage } from "../../../../lib/athena-availability";
import { prisma } from "../../../../lib/prisma";
import { getProviderProfileGaps } from "../../../../lib/athena-diagnostics.mjs";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(request) {
  const auth = await requireAdminRequest(request);
  if (!auth.ok) return auth.response;
  const input = await request.json().catch(() => ({}));
  const providerSlug =
    typeof input?.providerSlug === "string" ? input.providerSlug : "";
  if (providerSlug && !/^[a-z0-9-]{1,160}$/.test(providerSlug))
    return NextResponse.json(
      { ok: false, error: "Invalid provider." },
      { status: 400 },
    );
  const [coverage, providers] = await Promise.all([
    getAthenaProviderMappingCoverage({ providerSlug }),
    prisma.provider.findMany({
      where: { isActive: true },
      select: {
        id: true,
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
  const gaps = getProviderProfileGaps(providers);
  coverage.rows = coverage.rows.map((row) => ({
    ...row,
    providerId: providers.find((provider) => provider.slug === row.slug)?.id,
  }));
  return NextResponse.json({
    ok: true,
    coverage,
    gaps,
    checkedAt: new Date().toISOString(),
  });
}
