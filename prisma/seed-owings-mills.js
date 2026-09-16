const seed = require("./owings-mills-seed-data");

// Create only these two records; reruns preserve subsequent CMS edits.
module.exports = async function seedOwingsMills(prisma) {
  return prisma.$transaction(async (tx) => {
    const location = await tx.location.upsert({
      where: { slug: seed.location.slug },
      update: {},
      create: seed.location,
      select: { id: true, slug: true, title: true, isComingSoon: true },
    });
    const provider = await tx.provider.upsert({
      where: { slug: seed.provider.slug },
      update: {},
      create: seed.provider,
      select: {
        id: true,
        slug: true,
        name: true,
        isActive: true,
        locations: true,
      },
    });
    return { location, provider };
  });
};
