import { cache } from "react";
import { VISIBLE_LOCATION_WHERE } from "./locations";
import { isDatabaseConfigured, prisma } from "./prisma";

const FOUNDING_YEAR = 2008;
const FALLBACK_COUNTS = { providerCount: 59, locationCount: 18 };

// Shared by Home and About so both count the same active providers and visible offices.
export const getPracticeStats = cache(async () => {
  const yearsOfService = new Date().getFullYear() - FOUNDING_YEAR;

  if (!isDatabaseConfigured) return { ...FALLBACK_COUNTS, yearsOfService };

  try {
    const [providerCount, locationCount] = await Promise.all([
      prisma.provider.count({ where: { isActive: true } }),
      prisma.location.count({ where: VISIBLE_LOCATION_WHERE }),
    ]);

    return { providerCount, locationCount, yearsOfService };
  } catch (error) {
    console.error("Failed to load practice statistics, using fallback counts.", error);
    return { ...FALLBACK_COUNTS, yearsOfService };
  }
});
