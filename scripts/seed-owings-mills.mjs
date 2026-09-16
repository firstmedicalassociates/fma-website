import "dotenv/config";
import { prisma } from "../src/app/lib/prisma.js";
import seedOwingsMills from "../prisma/seed-owings-mills.js";

// Complete the Owings Mills public location and provider assignment.
try {
  const result = await seedOwingsMills(prisma);
  console.log(JSON.stringify(result, null, 2));
} finally {
  await prisma.$disconnect();
}
