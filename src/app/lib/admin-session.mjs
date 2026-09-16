import crypto from "node:crypto";
export const SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export function signAdminSession({ id, email, role, sessionVersion }) {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) throw new Error("ADMIN_AUTH_SECRET is not set.");
  const now = Math.floor(Date.now() / 1000);
  const json = JSON.stringify({
    sub: id,
    email,
    role,
    version: sessionVersion,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  });
  return `${Buffer.from(json).toString("base64url")}.${crypto.createHmac("sha256", secret).update(json).digest("base64url")}`;
}

export function verifyAdminSession(token) {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || typeof token !== "string" || token.length > 4096) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const json = Buffer.from(parts[0], "base64url").toString("utf8");
    const expected = Buffer.from(
      crypto.createHmac("sha256", secret).update(json).digest("base64url"),
    );
    const signature = Buffer.from(parts[1]);
    if (
      expected.length !== signature.length ||
      !crypto.timingSafeEqual(expected, signature)
    )
      return null;
    const payload = JSON.parse(json);
    if (
      typeof payload.sub !== "string" ||
      !Number.isInteger(payload.version) ||
      payload.version < 1 ||
      !Number.isFinite(payload.exp) ||
      payload.exp <= Date.now() / 1000
    )
      return null;
    return payload;
  } catch {
    return null;
  }
}

export function sessionMatchesUser(payload, user) {
  return Boolean(
    payload &&
      user &&
      user.id === payload.sub &&
      user.isActive &&
      ["ADMIN", "SUB_ADMIN"].includes(user.role) &&
      user.sessionVersion === payload.version,
  );
}
