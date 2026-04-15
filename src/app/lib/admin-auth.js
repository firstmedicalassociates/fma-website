import crypto from "crypto";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

function sign(payloadJson, secret) {
  return crypto.createHmac("sha256", secret).update(payloadJson).digest("base64url");
}

export function signAdminSession({ id, email, role }) {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret) {
    throw new Error("ADMIN_AUTH_SECRET is not set.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: id,
    email,
    role,
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  };

  const payloadJson = JSON.stringify(payload);
  const signature = sign(payloadJson, secret);
  return `${base64UrlEncode(payloadJson)}.${signature}`;
}

export function verifyAdminSession(token) {
  const secret = process.env.ADMIN_AUTH_SECRET;
  if (!secret || !token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  let payloadJson;
  try {
    payloadJson = base64UrlDecode(encodedPayload);
  } catch {
    return null;
  }

  const expectedSignature = sign(payloadJson, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return null;
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function getAdminSessionFromRequest(request) {
  return verifyAdminSession(request?.cookies?.get(SESSION_COOKIE)?.value);
}

export function requireAdminRequest(request) {
  const session = getAdminSessionFromRequest(request);

  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }),
    };
  }

  return { ok: true, session };
}
