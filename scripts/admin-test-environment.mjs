#!/usr/bin/env node
import "dotenv/config";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import bcrypt from "bcryptjs";
neonConfig.webSocketConstructor = ws;
const statePath = path.resolve(".env.admin-test");
const command = process.argv[2] || "setup";
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});
try {
  if (command === "setup") {
    try {
      await fs.access(statePath);
      throw new Error(
        "A test environment already exists. Clean it up before creating another.",
      );
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const schema = `fma_admin_test_${Date.now()}`;
    const password = crypto.randomBytes(20).toString("hex");
    const url = new URL(process.env.DIRECT_URL || process.env.DATABASE_URL);
    url.searchParams.set("schema", schema);
    url.searchParams.set("options", `-c search_path=${schema},public`);
    const env = {
      DATABASE_URL: url.toString(),
      DIRECT_URL: url.toString(),
      ADMIN_AUTH_SECRET: crypto.randomBytes(32).toString("hex"),
      ADMIN_TEST_SCHEMA: schema,
      ADMIN_TEST_PASSWORD: password,
      ADMIN_TEST_URL: "http://localhost:3157",
      OPENAI_API_KEY: "",
      OPENAI_ADMIN_KEY: "",
      OPENAI_PROJECT_ID: "",
      ATHENA_CLIENT_ID: "",
      UPSTASH_REDIS_REST_URL: "",
      UPSTASH_REDIS_REST_TOKEN: "",
    };
    await fs.writeFile(
      statePath,
      Object.entries(env)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join("\n"),
      { mode: 0o600 },
    );
    const client = await pool.connect();
    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}", public`);
      const folders = (
        await fs.readdir("prisma/migrations", { withFileTypes: true })
      )
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
      for (const folder of folders) {
        if (folder === "20260914223000_provider_zocdoc_url") {
          await client.query(
            'INSERT INTO "Provider" (id, slug, name, title, bio, "imageUrl", "isActive", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, false, NOW())',
            ["integration-zocdoc-migrated", "alisha-singh", "Zocdoc migration fixture", "PA-C", "Migration fixture", "/images/provider-placeholder.svg"],
          );
        }
        if (folder === "20260914120000_admin_access_and_ai_analytics") {
          await client.query(
            'INSERT INTO "AdminUser" (id, email, password, role, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
            [
              "integration-owner",
              "OWNER@Example.test",
              await bcrypt.hash(password, 12),
              "ADMIN",
            ],
          );
        }
        await client.query(
          await fs.readFile(
            `prisma/migrations/${folder}/migration.sql`,
            "utf8",
          ),
        );
      }
      const { rows } = await client.query(
        'SELECT email, "sessionVersion", "mustChangePassword", "isActive" FROM "AdminUser" WHERE id = $1',
        ["integration-owner"],
      );
      if (
        rows[0]?.email !== "owner@example.test" ||
        rows[0].sessionVersion !== 1 ||
        rows[0].mustChangePassword ||
        !rows[0].isActive
      )
        throw new Error("Existing admin migration failed.");
      console.log(
        `All migrations applied to isolated schema ${schema}; legacy administrator preserved.`,
      );
    } finally {
      client.release();
    }
  } else if (command === "cleanup") {
    const dotenv = await import("dotenv");
    const env = dotenv.parse(await fs.readFile(statePath));
    if (!/^fma_admin_test_\d+$/.test(env.ADMIN_TEST_SCHEMA))
      throw new Error("Unsafe test schema name.");
    await pool.query(`DROP SCHEMA "${env.ADMIN_TEST_SCHEMA}" CASCADE`);
    await fs.unlink(statePath);
    console.log("Removed isolated test schema and temporary credentials.");
  } else throw new Error("Use setup or cleanup.");
} finally {
  await pool.end();
}
