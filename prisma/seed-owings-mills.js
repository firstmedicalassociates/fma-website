const seed = require("./owings-mills-seed-data");

// Complete the Owings Mills launch fields while preserving CMS-managed contact and media details.
module.exports = async function seedOwingsMills(prisma) {
  return prisma.$transaction(async (tx) => {
    const activeServices = await tx.service.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      select: { id: true },
    });
    const serviceIds = activeServices.map((service) => service.id);
    const completedLocation = { ...seed.location, serviceIds };

    const location = await tx.location.upsert({
      where: { slug: seed.location.slug },
      update: {
        eyebrow: completedLocation.eyebrow,
        accent: completedLocation.accent,
        intro: completedLocation.intro,
        isComingSoon: completedLocation.isComingSoon,
        openingDateLabel: completedLocation.openingDateLabel,
        officeHours: completedLocation.officeHours,
        infoSections: completedLocation.infoSections,
        serviceIds,
      },
      create: completedLocation,
      select: {
        id: true,
        slug: true,
        title: true,
        isComingSoon: true,
        serviceIds: true,
        infoSections: true,
      },
    });

    const existingProvider = await tx.provider.findUnique({
      where: { slug: seed.provider.slug },
      select: { bio: true, imageAlt: true, locations: true },
    });
    const locations = [...new Set([...(existingProvider?.locations || []), seed.location.slug])];
    const shouldReplaceBio =
      !existingProvider?.bio || /planned provider|coming soon/i.test(existingProvider.bio);

    const provider = await tx.provider.upsert({
      where: { slug: seed.provider.slug },
      update: {
        bio: shouldReplaceBio ? seed.provider.bio : existingProvider.bio,
        imageAlt: existingProvider?.imageAlt || seed.provider.imageAlt,
        locations,
        isActive: true,
      },
      create: seed.provider,
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        locations: true,
      },
    });
    return { location, provider, activeServiceCount: serviceIds.length };
  });
};
