const PHOTO_BLOB_BASE_URL = "https://baxcyq9ou7fa56sc.private.blob.vercel-storage.com/location-photos";

const PHOTO_BLOBS = {
  "annapolis-1": `${PHOTO_BLOB_BASE_URL}/annapolis-1.webp`,
  "annapolis-2": `${PHOTO_BLOB_BASE_URL}/annapolis-2.webp`,
  "annapolis-3": `${PHOTO_BLOB_BASE_URL}/annapolis-3.webp`,
  "annapolis-md": `${PHOTO_BLOB_BASE_URL}/annapolis-md.webp`,
  "bowie-2": `${PHOTO_BLOB_BASE_URL}/bowie-2.webp`,
  "bowie-gallant-fox-ln": `${PHOTO_BLOB_BASE_URL}/bowie-gallant-fox-ln.webp`,
  "bowie-health-center-dr": `${PHOTO_BLOB_BASE_URL}/bowie-health-center-dr.webp`,
  "bowie-ii-md": `${PHOTO_BLOB_BASE_URL}/bowie-ii-md.webp`,
  "bowie-md": `${PHOTO_BLOB_BASE_URL}/bowie-md.webp`,
  "columbia-broken-land": `${PHOTO_BLOB_BASE_URL}/columbia-broken-land.webp`,
  "columbia-md": `${PHOTO_BLOB_BASE_URL}/columbia-md.webp`,
  "columbia-snowden-river": `${PHOTO_BLOB_BASE_URL}/columbia-snowden-river.webp`,
  crofton: `${PHOTO_BLOB_BASE_URL}/crofton.webp`,
  "crofton-md": `${PHOTO_BLOB_BASE_URL}/crofton-md.webp`,
  "frederick-md": `${PHOTO_BLOB_BASE_URL}/frederick-md.jpg`,
  "gaithersburg-1": `${PHOTO_BLOB_BASE_URL}/gaithersburg-1.webp`,
  "gaithersburg-2": `${PHOTO_BLOB_BASE_URL}/gaithersburg-2.webp`,
  "gaithersburg-md": `${PHOTO_BLOB_BASE_URL}/gaithersburg-md.webp`,
  "germantown-1": `${PHOTO_BLOB_BASE_URL}/germantown-1.webp`,
  "germantown-2": `${PHOTO_BLOB_BASE_URL}/germantown-2.webp`,
  "germantown-md": `${PHOTO_BLOB_BASE_URL}/germantown-md.webp`,
  "glen-burnie-1": `${PHOTO_BLOB_BASE_URL}/glen-burnie-1.webp`,
  "glen-burnie-2": `${PHOTO_BLOB_BASE_URL}/glen-burnie-2.webp`,
  "glen-burnie-md": `${PHOTO_BLOB_BASE_URL}/glen-burnie-md.jpg`,
  greenbelt: `${PHOTO_BLOB_BASE_URL}/greenbelt.webp`,
  "greenbelt-md": `${PHOTO_BLOB_BASE_URL}/greenbelt-md.webp`,
  "lutherville-1": `${PHOTO_BLOB_BASE_URL}/lutherville-1.webp`,
  "lutherville-2": `${PHOTO_BLOB_BASE_URL}/lutherville-2.webp`,
  "lutherville-md": `${PHOTO_BLOB_BASE_URL}/lutherville-md.webp`,
  nottingham: `${PHOTO_BLOB_BASE_URL}/nottingham.webp`,
  "nottingham-md": `${PHOTO_BLOB_BASE_URL}/nottingham-md.png`,
  "rockville-1": `${PHOTO_BLOB_BASE_URL}/rockville-1.webp`,
  "rockville-1-2": `${PHOTO_BLOB_BASE_URL}/rockville-1-2.webp`,
  "rockville-2": `${PHOTO_BLOB_BASE_URL}/rockville-2.webp`,
  "rockville-md": `${PHOTO_BLOB_BASE_URL}/rockville-md.webp`,
  "severna-park-1": `${PHOTO_BLOB_BASE_URL}/severna-park-1.webp`,
  "severna-park-2": `${PHOTO_BLOB_BASE_URL}/severna-park-2.webp`,
  "severna-park-3": `${PHOTO_BLOB_BASE_URL}/severna-park-3.webp`,
  "severna-park-md": `${PHOTO_BLOB_BASE_URL}/severna-park-md.webp`,
  "silver-spring-1": `${PHOTO_BLOB_BASE_URL}/silver-spring-1.webp`,
  "silver-spring-2": `${PHOTO_BLOB_BASE_URL}/silver-spring-2.webp`,
  "silver-spring-building": `${PHOTO_BLOB_BASE_URL}/silver-spring-building.webp`,
};

const PHOTO_ALTS = {
  "silver-spring-building": "Exterior of the First Medical Associates Silver Spring office building",
};

const LOCATION_PHOTO_SETS = {
  "/bowie-2": {
    primary: "bowie-health-center-dr",
    gallery: ["bowie-health-center-dr", "bowie-ii-md"],
  },
  "/columbia-2": {
    primary: "columbia-broken-land",
    gallery: ["columbia-broken-land"],
  },
  "/location/annapolis": {
    primary: "annapolis-1",
    gallery: ["annapolis-1", "annapolis-2", "annapolis-3", "annapolis-md"],
  },
  "/location/bowie": {
    primary: "bowie-gallant-fox-ln",
    gallery: ["bowie-gallant-fox-ln", "bowie-2", "bowie-md"],
  },
  "/location/columbia": {
    primary: "columbia-snowden-river",
    gallery: ["columbia-snowden-river", "columbia-md"],
  },
  "/location/crofton": {
    primary: "crofton",
    gallery: ["crofton", "crofton-md"],
  },
  "/location/frederick": {
    primary: "frederick-md",
    gallery: ["frederick-md"],
  },
  "/location/gaithersburg": {
    primary: "gaithersburg-2",
    gallery: ["gaithersburg-2", "gaithersburg-1", "gaithersburg-md"],
  },
  "/location/germantown": {
    primary: "germantown-2",
    gallery: ["germantown-2", "germantown-1", "germantown-md"],
  },
  "/location/glen-burnie": {
    primary: "glen-burnie-1",
    gallery: ["glen-burnie-1", "glen-burnie-md"],
  },
  "/location/greenbelt": {
    primary: "greenbelt",
    gallery: ["greenbelt", "greenbelt-md"],
  },
  "/location/lutherville": {
    primary: "lutherville-2",
    gallery: ["lutherville-2", "lutherville-1", "lutherville-md"],
  },
  "/location/nottingham": {
    primary: "nottingham",
    gallery: ["nottingham", "nottingham-md"],
  },
  "/location/rockville": {
    primary: "rockville-1",
    gallery: ["rockville-1", "rockville-1-2", "rockville-2", "rockville-md"],
  },
  "/location/severna-park": {
    primary: "severna-park-1",
    gallery: ["severna-park-1", "severna-park-2", "severna-park-3", "severna-park-md"],
  },
  "/location/silver-spring": {
    primary: "silver-spring-2",
    gallery: ["silver-spring-2", "silver-spring-1", "silver-spring-building"],
  },
};

function normalizeLocationSlug(value = "") {
  const normalized = String(value || "").trim().replace(/\/+$/g, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

function buildPhotoAlt(location, index) {
  const title = String(location?.title || "First Medical Associates location").trim();
  return `${title} office photo ${index + 1}`;
}

function buildPhoto(key, location, index) {
  return {
    key,
    src: `/api/location-photos/${encodeURIComponent(key)}`,
    alt: PHOTO_ALTS[key] || buildPhotoAlt(location, index),
  };
}

export function getLocationPhotoBlobUrl(key = "") {
  return PHOTO_BLOBS[String(key || "").trim()] || "";
}

export function getLocationPhotoSet(location = {}) {
  const photoSet = LOCATION_PHOTO_SETS[normalizeLocationSlug(location.slug)];
  if (!photoSet) return null;

  const galleryKeys = [...new Set([photoSet.primary, ...(photoSet.gallery || [])])].filter((key) =>
    Boolean(PHOTO_BLOBS[key])
  );
  const gallery = galleryKeys.map((key, index) => buildPhoto(key, location, index));
  const primaryIndex = gallery.findIndex((photo) => photo.key === photoSet.primary);

  return {
    primary: primaryIndex >= 0 ? gallery[primaryIndex] : gallery[0] || null,
    gallery,
  };
}

export function resolveLocationPrimaryImage(location = {}) {
  return getLocationPhotoSet(location)?.primary || null;
}

export function resolveLocationGalleryImages(location = {}) {
  return getLocationPhotoSet(location)?.gallery || [];
}
