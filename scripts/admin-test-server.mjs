#!/usr/bin/env node
import http from "node:http";
import { spawn } from "node:child_process";
if (!/^fma_admin_test_\d+$/.test(process.env.ADMIN_TEST_SCHEMA || ""))
  throw new Error(
    "Start with --env-file=.env.admin-test after creating an isolated test schema.",
  );
// Local deterministic Redis-compatible fixture for public rate-limiter HTTP calls.
const counts = new Map();
const redis = http.createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  const [command, key, duration] = JSON.parse(body);
  let item = counts.get(key);
  if (!item || item.expires < Date.now())
    item = { count: 0, expires: Date.now() + 60000 };
  if (command === "INCR") item.count++;
  if (command === "PEXPIRE") item.expires = Date.now() + duration;
  counts.set(key, item);
  const result =
    command === "INCR"
      ? item.count
      : command === "PEXPIRE"
        ? 1
        : item.expires - Date.now();
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ result }));
});
await new Promise((resolve) => redis.listen(3158, "127.0.0.1", resolve));
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3157", "-H", "127.0.0.1"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      UPSTASH_REDIS_REST_URL: "http://127.0.0.1:3158",
      UPSTASH_REDIS_REST_TOKEN: "local-test-fixture",
      NODE_ENV: "production",
    },
  },
);
function stop() {
  child.kill("SIGTERM");
  redis.close();
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
child.on("exit", (code) => {
  redis.close();
  process.exitCode = code || 0;
});
