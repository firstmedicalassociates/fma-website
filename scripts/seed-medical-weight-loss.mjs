import "dotenv/config";
import { prisma } from "../src/app/lib/prisma.js";
import seedMedicalWeightLoss from "../prisma/seed-medical-weight-loss.js";

try {
  const result = await seedMedicalWeightLoss(prisma);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
