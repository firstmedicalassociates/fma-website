export function splitLocationSlug(value = "") {
  return String(value || "")
    .replace(/^\/+|\/+$/g, "")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function joinLocationSegments(segments = []) {
  const normalizedSegments = Array.isArray(segments)
    ? segments
        .map((segment) => String(segment || "").trim())
        .filter(Boolean)
    : [];

  return normalizedSegments.length > 0 ? `/${normalizedSegments.join("/")}` : "";
}

export function normalizeLocationSlug(value = "") {
  const segments = String(value)
    .split("/")
    .map((segment) =>
      String(segment)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "-")
        .replace(/^-+|-+$/g, "")
    )
    .filter(Boolean);

  return segments.length > 0 ? `/${segments.join("/")}` : "";
}

export function groupLocationServices(services = []) {
  const entries = Array.isArray(services) ? services : [];

  return entries.reduce((groups, service) => {
    if (!service?.title || !service?.description) {
      return groups;
    }

    const category = String(service.category || "General Care").trim() || "General Care";
    const existingGroup = groups.find((group) => group.category === category);

    if (existingGroup) {
      existingGroup.items.push(service);
      return groups;
    }

    groups.push({
      category,
      items: [service],
    });
    return groups;
  }, []);
}

export function formatLocationPathname(pathname = "") {
  const normalized = String(pathname || "").trim();
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}
