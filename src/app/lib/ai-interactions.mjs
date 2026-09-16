import crypto from "node:crypto";
import { GENERAL_BOOK_APPOINTMENT_URL } from "./config/site.js";
const ALLOWED_TYPES = new Set([
  "provider",
  "location",
  "booking",
  "source",
  "result",
]);
function secret() {
  return (
    process.env.AI_SEARCH_EVENT_SECRET?.trim() ||
    process.env.ADMIN_AUTH_SECRET?.trim() ||
    ""
  );
}
export function targetReference(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value, "https://drsfirst.com");
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return ["drsfirst.com", "www.drsfirst.com"].includes(url.hostname)
      ? url.pathname
      : `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}
export function signInteractionTarget(
  eventId,
  type,
  targetRef,
  now = Date.now(),
) {
  if (!secret() || !ALLOWED_TYPES.has(type) || !targetRef) return "";
  const payload = Buffer.from(
    JSON.stringify({
      eventId,
      type,
      targetRef,
      exp: Math.floor(now / 1000) + 86400,
    }),
  ).toString("base64url");
  return `${payload}.${crypto.createHmac("sha256", secret()).update(`click:${payload}`).digest("base64url")}`;
}
export function verifyInteractionTarget(token, now = Date.now()) {
  if (!secret() || typeof token !== "string" || token.length > 3000)
    return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  try {
    const expected = Buffer.from(
      crypto
        .createHmac("sha256", secret())
        .update(`click:${parts[0]}`)
        .digest("base64url"),
    );
    const given = Buffer.from(parts[1]);
    if (
      expected.length !== given.length ||
      !crypto.timingSafeEqual(expected, given)
    )
      return null;
    const value = JSON.parse(Buffer.from(parts[0], "base64url").toString());
    if (
      !Number.isFinite(value.exp) ||
      value.exp <= now / 1000 ||
      !ALLOWED_TYPES.has(value.type) ||
      typeof value.eventId !== "string" ||
      typeof value.targetRef !== "string"
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
export function buildInteractionTargets(
  eventId,
  ai,
  results = [],
  includeQuickActions = false,
) {
  const targets = new Map();
  function add(url, kind) {
    const ref = targetReference(url);
    if (!ref) return;
    const type =
      kind === "appointment" || kind === "booking"
        ? "booking"
        : kind === "provider" || /\/providers\//.test(ref)
          ? "provider"
          : kind === "location" || /\/location\//.test(ref)
            ? "location"
            : kind === "result"
              ? "result"
              : "source";
    const old = targets.get(url);
    if (old?.type === "booking") return;
    targets.set(url, {
      url,
      type,
      ref,
      token: signInteractionTarget(eventId, type, ref),
    });
  }
  for (const source of ai.sources || []) add(source.url, source.type);
  for (const card of ai.cards || ai.structuredCards || []) {
    add(card.href || card.url, card.type || card.kind);
    if (card.bookingUrl) add(card.bookingUrl, "booking");
  }
  for (const option of ai.appointmentOptions || []) {
    add(option.providerUrl, "provider");
    add(option.bookingUrl, "booking");
  }
  for (const action of ai.recoveryActions || [])
    add(
      action.href,
      /book|appoint/i.test(action.label || "") ? "booking" : "source",
    );
  for (const result of results) add(result.href, result.kind || "result");
  if (includeQuickActions) {
    add(GENERAL_BOOK_APPOINTMENT_URL, "booking");
    add("/providers/", "provider");
    add("/locations/", "location");
  }
  return [...targets.values()].filter((target) => target.token);
}
