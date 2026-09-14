import "dotenv/config";
import { prisma } from "../src/app/lib/prisma.js";
import seedOwingsMills from "../prisma/seed-owings-mills.js";

// Create only these two records; reruns preserve subsequent CMS edits.
try {
  const result = await seedOwingsMills(prisma);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
