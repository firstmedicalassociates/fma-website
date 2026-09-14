export const CONTENT_SECTIONS = ["posts", "locations", "services", "providers"];
export const PERMISSION_GROUPS = [
  ...CONTENT_SECTIONS.map((key) => ({
    key,
    label: key[0].toUpperCase() + key.slice(1),
    actions: ["view", "edit", "delete"],
  })),
  { key: "ai-search", label: "AI Search", actions: ["view", "edit"] },
  { key: "spending", label: "API spending", actions: ["view"] },
];
export const PERMISSIONS = PERMISSION_GROUPS.flatMap(({ key, actions }) =>
  actions.map((action) => `${key}.${action}`),
);

export function normalizePermissions(value) {
  if (!Array.isArray(value) || value.some((key) => !PERMISSIONS.includes(key)))
    throw new Error("Choose valid permissions.");
  const selected = new Set(value);
  for (const key of selected) {
    const [section, action] = key.split(".");
    if (action !== "view") selected.add(`${section}.view`);
  }
  if (selected.has("spending.view")) selected.add("ai-search.view");
  return [...selected].sort();
}

export function hasPermission(user, permission) {
  if (!user || !user.isActive) return false;
  if (user.mustChangePassword) return permission === "account";
  if (permission === "account" || permission === "dashboard") return true;
  if (user.role === "ADMIN") return true;
  if (user.role !== "SUB_ADMIN" || permission === "admin") return false;
  if (Array.isArray(permission))
    return permission.some((key) => hasPermission(user, key));
  return (
    PERMISSIONS.includes(permission) &&
    user.permissions?.includes(permission) === true
  );
}

export function permissionForRequest(pathname, method = "GET") {
  if (["/api/admin/logout", "/api/admin/account/password"].includes(pathname))
    return "account";
  if (pathname === "/api/admin/uploads")
    return ["posts.edit", "locations.edit", "providers.edit"];
  if (pathname.startsWith("/api/admin/provider-images/"))
    return "providers.view";
  if (pathname.startsWith("/api/admin/ai-search/feedback/"))
    return method === "GET" ? "ai-search.view" : "ai-search.edit";
  if (pathname.startsWith("/api/admin/ai-search/analytics"))
    return "ai-search.view";
  if (pathname.startsWith("/api/admin/ai-search/spending"))
    return "spending.view";
  for (const section of CONTENT_SECTIONS) {
    if (
      pathname === `/api/admin/${section}` ||
      pathname.startsWith(`/api/admin/${section}/`)
    )
      return `${section}.${["GET", "HEAD"].includes(method) ? "view" : method === "DELETE" ? "delete" : "edit"}`;
  }
  return "admin";
}

export function normalizeAdminEmail(value) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Enter a valid email address.");
  return email;
}

export function validateAdminPassword(value) {
  if (typeof value !== "string" || [...value].length < 12)
    throw new Error("Use at least 12 characters for your password.");
  if (new TextEncoder().encode(value).length > 72)
    throw new Error("The password must not exceed 72 UTF-8 bytes.");
  return value;
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin)
    return (
      !request.headers.get("sec-fetch-site") ||
      request.headers.get("sec-fetch-site") === "same-origin"
    );
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
