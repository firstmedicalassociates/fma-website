const serviceSeedData = require("./service-seed-data");
const {
  MEDICAL_WEIGHT_LOSS_SLUG,
  MEDICAL_WEIGHT_LOSS_LOCATIONS,
  filterServicesForLocation,
} = require("../src/app/lib/service-availability.cjs");

// Register just this service and reconcile its office assignments, preserving other CMS data.
module.exports = async function seedMedicalWeightLoss(prisma) {
  return prisma.$transaction(async (tx) => {
    for (const office of MEDICAL_WEIGHT_LOSS_LOCATIONS) {
      const offeringLocation = await tx.location.findUnique({
        where: { slug: office.slug },
        select: { id: true },
      });
      if (!offeringLocation) {
        throw new Error(`The ${office.title} office must exist before registering this service.`);
      }
    }

    const seedIndex = serviceSeedData.findIndex((entry) => entry.slug === MEDICAL_WEIGHT_LOSS_SLUG);
    if (seedIndex === -1) throw new Error("Medical weight loss service seed content is missing.");
    const seed = serviceSeedData[seedIndex];
    const service = await tx.service.upsert({
      where: { slug: MEDICAL_WEIGHT_LOSS_SLUG },
      update: { ...seed, isActive: true },
      create: { ...seed, sortOrder: seedIndex, isActive: true },
      select: { id: true, slug: true, title: true },
    });

    const locations = await tx.location.findMany({
      select: { id: true, slug: true, serviceIds: true },
    });
    let updatedLocationCount = 0;
    for (const location of locations) {
      const existingIds = location.serviceIds || [];
      const allowed = filterServicesForLocation([service], location.slug).length > 0;
      // Preserve the service's position if already assigned; remove only this ID elsewhere.
      const serviceIds = allowed
        ? existingIds.includes(service.id) ? existingIds : [...existingIds, service.id]
        : existingIds.filter((id) => id !== service.id);
      if (JSON.stringify(serviceIds) === JSON.stringify(existingIds)) continue;
      await tx.location.update({
        where: { id: location.id },
        data: { serviceIds },
      });
      updatedLocationCount += 1;
    }

    return { service, offeringLocationSlugs: MEDICAL_WEIGHT_LOSS_LOCATIONS.map(({ slug }) => slug), updatedLocationCount };
  });
};
