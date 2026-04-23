import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis;
const databaseUrl = process.env.DATABASE_URL?.trim() || "";

export const isDatabaseConfigured = Boolean(databaseUrl);

function createMissingDatabaseError(modelName = "database", methodName = "query") {
  return new Error(
    `DATABASE_URL is not set, so ${modelName}.${methodName} cannot run. Add DATABASE_URL to your environment before using database-backed routes.`
  );
}

function createMissingOperation(modelName, methodName) {
  return () => {
    throw createMissingDatabaseError(modelName, methodName);
  };
}

function createMissingModelProxy(modelName) {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") return undefined;

        return createMissingOperation(modelName, String(property));
      },
    }
  );
}

function createMissingPrismaClient() {
  return new Proxy(
    {},
    {
      get(_target, property) {
        if (property === "then") return undefined;

        if (property === "$connect" || property === "$disconnect") {
          return async () => undefined;
        }

        if (String(property).startsWith("$")) {
          return createMissingOperation("prisma", String(property));
        }

        return createMissingModelProxy(String(property));
      },
    }
  );
}

const prismaClient =
  globalForPrisma.prisma ||
  (isDatabaseConfigured
    ? new PrismaClient({
        adapter: new PrismaNeon({ connectionString: databaseUrl }),
      })
    : createMissingPrismaClient());

export const prisma = prismaClient;

if (process.env.NODE_ENV !== "production" && isDatabaseConfigured) {
  globalForPrisma.prisma = prisma;
}
