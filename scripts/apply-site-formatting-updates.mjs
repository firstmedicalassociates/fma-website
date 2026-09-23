import fs from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";
import { prisma } from "../src/app/lib/prisma.js";

// Only the reviewed public copy fields are changed; booking and provider IDs stay intact.
const manifest = JSON.parse(await fs.readFile(new URL("../data/site-formatting-updates-2026-09-23.json", import.meta.url), "utf8"));
const apply = process.argv.includes("--apply");
try {
  const pending = [];
  for (const change of manifest.changes) {
    const row = await prisma[change.model].findUnique({ where: { slug: change.slug } });
    if (!row) throw new Error(`Missing ${change.model}: ${change.slug}`);
    if (isDeepStrictEqual(row[change.field], change.after)) continue;
    if (!isDeepStrictEqual(row[change.field], change.before)) {
      throw new Error(`Content changed since review: ${change.slug}.${change.field}`);
    }
    pending.push(change);
  }
  console.log(JSON.stringify({ apply, fields: pending.map(({ model, slug, field }) => ({ model, slug, field })) }, null, 2));
  if (apply && pending.length) {
    await fs.mkdir("artifacts/site-audit/formatting-2026-09-23", { recursive: true });
    const backup = `artifacts/site-audit/formatting-2026-09-23/content-backup-${Date.now()}.json`;
    await fs.writeFile(backup, JSON.stringify(pending, null, 2));
    await prisma.$transaction(async (tx) => {
      for (const change of pending) {
        const row = await tx[change.model].findUnique({ where: { slug: change.slug } });
        if (!isDeepStrictEqual(row?.[change.field], change.before)) throw new Error(`Concurrent change: ${change.slug}`);
        const result = await tx[change.model].updateMany({
          where: { id: row.id, updatedAt: row.updatedAt },
          data: { [change.field]: change.after },
        });
        if (result.count !== 1) throw new Error(`Concurrent update: ${change.slug}`);
      }
    }, { timeout: 60000 });
    console.log(JSON.stringify({ updatedFields: pending.length, backup }));
  }
} finally {
  await prisma.$disconnect();
}
