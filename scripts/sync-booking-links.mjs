import fs from "node:fs/promises";
import { prisma } from "../src/app/lib/prisma.js";
import {
  VERIFIED_PROVIDER_BOOKING_PATHS,
  isLegacyBookingUrl,
  resolveLocationBookingHref,
} from "../src/app/lib/booking.js";
import { resolveProviderBookingHref } from "../src/app/lib/providers.js";
import { validateZocdocUrl } from "../src/app/lib/zocdoc.js";

// Dry-run by default. Apply only booking fields; retain launch flags, profiles,
// Zocdoc links, and any newer provider-specific CMS override.
try {
  const zocdocUpdates = JSON.parse(await fs.readFile(new URL("../data/asana-website-link-updates-2026-09-22.json", import.meta.url), "utf8"));
  for (const update of zocdocUpdates) {
    if (validateZocdocUrl(update.zocdocUrl)) throw new Error(`Invalid Zocdoc link: ${update.slug}`);
  }
  const [locations, providers] = await Promise.all([
    prisma.location.findMany({ select: { id: true, slug: true, title: true, bookingUrl: true, isComingSoon: true } }),
    prisma.provider.findMany({ where: { isActive: true }, select: { id: true, slug: true, name: true, linkUrl: true, zocdocUrl: true } }),
  ]);
  const changes = [
    ...locations.filter((location) => !location.isComingSoon).map((location) => ({
      model: "location", id: location.id, slug: location.slug, field: "bookingUrl",
      before: location.bookingUrl, after: resolveLocationBookingHref(location),
    })),
    ...providers.filter((provider) => VERIFIED_PROVIDER_BOOKING_PATHS[provider.slug] &&
      (!provider.linkUrl || isLegacyBookingUrl(provider.linkUrl))).map((provider) => ({
      model: "provider", id: provider.id, slug: provider.slug, field: "linkUrl",
      before: provider.linkUrl, after: resolveProviderBookingHref(provider),
    })),
    ...zocdocUpdates.map((update) => {
      const provider = providers.find((entry) => entry.slug === update.slug);
      if (!provider) throw new Error(`Missing active provider: ${update.slug}`);
      return {
        model: "provider", id: provider.id, slug: provider.slug, field: "zocdocUrl",
        before: provider.zocdocUrl, after: update.zocdocUrl,
      };
    }),
  ].filter((change) => change.before !== change.after);
  console.log(JSON.stringify({ apply: process.argv.includes("--apply"), changes }, null, 2));
  if (process.argv.includes("--apply") && changes.length) {
    await fs.mkdir("artifacts/booking-links", { recursive: true });
    const backup = `artifacts/booking-links/before-${Date.now()}.json`;
    await fs.writeFile(backup, JSON.stringify(changes, null, 2));
    const results = await prisma.$transaction(changes.map((change) =>
      prisma[change.model].updateMany({
        where: { id: change.id, [change.field]: change.before },
        data: { [change.field]: change.after },
      })
    ));
    console.log(JSON.stringify({ updated: results.reduce((sum, result) => sum + result.count, 0), backup }));
  }
} finally {
  await prisma.$disconnect();
}
