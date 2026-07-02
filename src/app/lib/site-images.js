const SITE_IMAGE_BLOB_BASE_URL = "https://baxcyq9ou7fa56sc.private.blob.vercel-storage.com/site-images";

const SITE_IMAGE_BLOBS = {
  "first-medical-associates-doctors-4": `${SITE_IMAGE_BLOB_BASE_URL}/first-medical-associates-doctors-4.webp`,
  "first-medical-associates-doctors-5": `${SITE_IMAGE_BLOB_BASE_URL}/first-medical-associates-doctors-5.webp`,
  "first-medical-associates-doctors-9": `${SITE_IMAGE_BLOB_BASE_URL}/first-medical-associates-doctors-9.webp`,
};

export function getSiteImageBlobUrl(key = "") {
  return SITE_IMAGE_BLOBS[String(key || "").trim()] || "";
}

export function getSiteImageSrc(key = "") {
  const normalizedKey = String(key || "").trim();
  return normalizedKey ? `/api/site-images/${encodeURIComponent(normalizedKey)}` : "";
}
