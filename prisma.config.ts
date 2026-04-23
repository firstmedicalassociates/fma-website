import "dotenv/config";
import { defineConfig } from "prisma/config";

const fallbackDatabaseUrl =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL ||
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node ./prisma/seed.js",
  },
  datasource: {
    // Prefer the direct connection for migrations, but fall back so `prisma generate`
    // can still run in environments where only DATABASE_URL is configured or no env
    // file has been created yet.
    url: fallbackDatabaseUrl,
  },
});
