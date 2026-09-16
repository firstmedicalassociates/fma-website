import { adminError } from "./admin-auth";
import { getRateLimitIdentity } from "./rate-limit";
import { prisma } from "./prisma";
export async function limitCredentials(request, scope, userId = "") {
  const key = `${getRateLimitIdentity(request, scope)}:${userId}`;
  try {
    // Atomic, shared across server instances; no additional Redis configuration is needed.
    await prisma.adminCredentialAttempt.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    const [attempt] = await prisma.$queryRaw`
      INSERT INTO "AdminCredentialAttempt" (key, count, "expiresAt") VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT (key) DO UPDATE SET count = CASE WHEN "AdminCredentialAttempt"."expiresAt" <= NOW() THEN 1 ELSE "AdminCredentialAttempt".count + 1 END,
      "expiresAt" = CASE WHEN "AdminCredentialAttempt"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "AdminCredentialAttempt"."expiresAt" END
      RETURNING count, "expiresAt"`;
    if (attempt.count <= 10) return null;
    const response = adminError(
      "Too many attempts. Please try again later.",
      429,
    );
    response.headers.set(
      "Retry-After",
      String(Math.max(1, Math.ceil((attempt.expiresAt - Date.now()) / 1000))),
    );
    return response;
  } catch (error) {
    console.error(
      "Credential rate limit unavailable:",
      error.code || error.name,
    );
    return adminError("Sign-in services are temporarily unavailable.", 503);
  }
}
export function accountErrorResponse(error) {
  if (error.code === "P2002")
    return adminError("An account with that email already exists.", 409);
  if (
    error.status ||
    (error instanceof Error &&
      !error.code &&
      /Choose|password|email|permission/i.test(error.message))
  )
    return adminError(error.message, error.status || 400);
  console.error("Admin account operation failed:", error.code || error.name);
  return adminError("Unable to update the account. Please try again.", 500);
}
