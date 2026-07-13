export const LOCATION_SEARCH_RADIUS_MILES = 50;
export const LOCATION_SEARCH_FALLBACK_GROUPS = 3;

function cleanText(value = "") {
  return String(value || "").trim();
}

function normalizeGroupPart(value = "") {
  return cleanText(value).toLocaleLowerCase("en-US");
}

function isFiniteDistance(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function getUniqueProviderCount(locations = []) {
  const providerSlugs = new Set();

  for (const location of locations) {
    for (const provider of Array.isArray(location.providers) ? location.providers : []) {
      const providerSlug = cleanText(provider?.slug);
      if (providerSlug) providerSlugs.add(providerSlug);
    }
  }

  if (providerSlugs.size > 0) return providerSlugs.size;

  return locations.reduce((total, location) => {
    const providerCount = Number(location?.providerCount);
    return total + (Number.isFinite(providerCount) ? providerCount : 0);
  }, 0);
}

export function toRadians(value) {
  return (value * Math.PI) / 180;
}

export function calculateDistanceMiles(origin, target) {
  if (!origin || !target) return null;

  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(target.lat - origin.lat);
  const longitudeDelta = toRadians(target.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const targetLatitude = toRadians(target.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMiles * arc;
}

export function groupLocationsByStructuredCity(locations = []) {
  const groupsByKey = new Map();

  locations.forEach((location, index) => {
    const addressCity = cleanText(location?.addressCity);
    const addressState = cleanText(location?.addressState);
    const hasStructuredCity = Boolean(addressCity && addressState);
    const locationIdentity = cleanText(location?.slug) || cleanText(location?.id) || String(index);
    const key = hasStructuredCity
      ? `city:${normalizeGroupPart(addressCity)}|${normalizeGroupPart(addressState)}`
      : `location:${locationIdentity}`;

    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, {
        key,
        city: addressCity,
        state: addressState,
        locations: [],
        firstIndex: index,
      });
    }

    groupsByKey.get(key).locations.push(location);
  });

  return [...groupsByKey.values()].map((group) => {
    const orderedLocations = [...group.locations].sort((left, right) => {
      const leftDistance = isFiniteDistance(left?.distanceMiles)
        ? left.distanceMiles
        : Number.POSITIVE_INFINITY;
      const rightDistance = isFiniteDistance(right?.distanceMiles)
        ? right.distanceMiles
        : Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) return leftDistance - rightDistance;
      return cleanText(left?.title).localeCompare(cleanText(right?.title));
    });
    const nearestLocation = orderedLocations.find((location) =>
      isFiniteDistance(location?.distanceMiles)
    );
    const firstLocation = orderedLocations[0] || {};

    return {
      key: group.key,
      city: group.city,
      state: group.state,
      title:
        orderedLocations.length > 1 && group.city
          ? group.city
          : cleanText(firstLocation.title) || group.city || "Location",
      locations: orderedLocations,
      nearestDistanceMiles: nearestLocation?.distanceMiles ?? null,
      providerCount: getUniqueProviderCount(orderedLocations),
      firstIndex: group.firstIndex,
    };
  });
}

export function selectLocationGroupsForSearch(
  groups = [],
  {
    radiusMiles = LOCATION_SEARCH_RADIUS_MILES,
    fallbackGroupCount = LOCATION_SEARCH_FALLBACK_GROUPS,
  } = {}
) {
  const measurableGroups = groups
    .filter((group) => isFiniteDistance(group?.nearestDistanceMiles))
    .sort((left, right) => {
      if (left.nearestDistanceMiles !== right.nearestDistanceMiles) {
        return left.nearestDistanceMiles - right.nearestDistanceMiles;
      }

      return cleanText(left.title).localeCompare(cleanText(right.title));
    });
  const groupsWithinRadius = measurableGroups.filter(
    (group) => group.nearestDistanceMiles <= radiusMiles
  );

  if (groupsWithinRadius.length > 0) {
    return {
      groups: groupsWithinRadius,
      usedNearestFallback: false,
      hasDistanceData: true,
    };
  }

  return {
    groups: measurableGroups.slice(0, fallbackGroupCount),
    usedNearestFallback: measurableGroups.length > 0,
    hasDistanceData: measurableGroups.length > 0,
  };
}

export function flattenLocationGroups(groups = []) {
  return groups.flatMap((group) => group.locations || []);
}
