import { SITE_NAME, absoluteUrl } from "./config/site";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function truncateText(value = "", maxLength = 160) {
  const normalized = cleanText(value);
  if (!normalized) return "";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function formatLocationSeoPlace(location = {}) {
  const city = cleanText(location.addressCity);
  const state = cleanText(location.addressState);
  const title = cleanText(location.title) || "Maryland";

  if (city && state) {
    return `${city}, ${state}`;
  }

  return title;
}

const LOCATION_SEO_BY_SLUG = {
  "/location/annapolis": {
    title: "Same-Day Healthcare at First Medical Associates in Annapolis | Convenient Care",
    h1: "Primary care Doctor in Annapolis, MD",
  },
  "/bowie-2": {
    title: "Primary Care Doctor at Bowie II, MD | First Medical Associates",
    h1: "Best primary care physician and doctor in Bowie, MD",
  },
  "/location/bowie": {
    title: "Top Doctors & Same-Day Appointments in Bowie, MD | First Medical Associates",
    h1: "Best primary care physician and doctor in Bowie, MD",
  },
  "/location/columbia": {
    title: "Columbia | Primary Care Doctor at First Medical Associates",
    h1: "Best primary care physician and doctor in Columbia, MD",
  },
  "/location/crofton": {
    title: "Crofton | Primary Care Doctor at First Medical Associates",
    h1: "Primary care Doctor in Crofton, MD",
  },
  "/location/frederick": {
    title: "Primary Care & Family Doctors | Same-Day Appointments in Frederick, MD | First Medical Associates",
    h1: "Primary care Doctor in Frederick, MD",
  },
  "/location/gaithersburg": {
    title: "Same-Day Healthcare at First Medical Associates in Gaithersburg | Quick & Convenient Care",
    h1: "Family doctor in Gaithersburg, MD",
  },
  "/location/germantown": {
    title: "Primary Care Doctor in Germantown, MD | Comprehensive Same-Day Appointments & Family Doctors | First Medical Associates",
    h1: "Primary care Doctor in Germantown, MD",
  },
  "/location/glen-burnie": {
    title: "Same-Day Healthcare at First Medical Associates in Glen Burnie | Quick & Convenient Care",
    h1: "Primary care Doctor in Glen Burnie, MD",
  },
  "/location/greenbelt": {
    title: "Greenbelt | Primary Care Doctor at First Medical Associates",
    h1: "Primary care doctor in GREENBELT, MD",
  },
  "/location/lutherville": {
    title: "Primary Care Doctor in Lutherville | First Medical Associates",
    h1: "Primary care Doctor in Lutherville, MD",
  },
  "/location/nottingham": {
    title: "Primary Care Doctor in Nottingham, MD | Family & Same-Day Appointments | First Medical Associates",
    h1: "Primary Care Doctor in Nottingham, MD",
  },
  "/location/rockville": {
    title: "Primary Care Doctor in Rockville, MD | First Medical Associates",
    h1: "Primary care Doctor in Rockville, MD",
  },
  "/location/severna-park": {
    title: "Same-Day Healthcare at First Medical Associates in Severna Park | Fast & Reliable Care",
    h1: "Primary care Doctor in Severna Park, MD",
  },
  "/location/silver-spring": {
    title: "Primary Care Doctor in Silver Spring, MD | First Medical Associates",
    h1: "Primary care Doctor in Silver Spring, MD",
  },
};

const PROVIDER_SEO_OVERRIDES = {
  "jason-lowry": {
    titleName: "Jason Lowry",
  },
  "maria-munoz-md": {
    h1: "Maria Munoz-Ritterbusch",
  },
  "quoc-anh-nguyen": {
    titleName: "Quoc Anh Nguyen",
    h1: "Dr. Quinton Nguyen",
  },
  "rakesh-malik": {
    h1: "Dr. Rakesh Malik",
  },
  "sharon-j-mccormack": {
    titleName: "Sharon J. McCormack",
    h1: "Sharon J. McCormack",
  },
};

const SERVICE_SEO_TITLES_BY_SLUG = {
  asthma: "Chronic Asthma Care Doctor in Maryland | Expert Treatment",
  depression: "Depression Care Doctor in Maryland | Compassionate Support",
  diabetes: "Diabetes Doctor in Maryland | Expert Care & Management",
  "gastrointestinal-issues":
    "Gastrointestinal Doctor at First Medical Associates in Maryland | Specialized Care",
  "geriatric-care": "Geriatric Doctor at First Medical Associates in Maryland | Expert Senior Care",
  "uti-test-and-treatment":
    "UTI Treatment at First Medical Associates in Maryland | Fast & Effective Care",
  "sore-throat": "Sore Throat and Flu Treatment in Maryland | Fast Relief",
  telemedicine:
    "Telemedicine Services at First Medical Associates in Maryland | Convenient Online Care",
  "annual-physicals": "Annual Physicals at First Medical Associates in Maryland | Expert Care",
  "primary-care": "Primary Care Doctor at First Medical Associates in Maryland | Trusted Healthcare",
  "same-day-care": "Same-Day Care in Maryland | Quick & Reliable Care",
  "mens-health": "Men's Health Doctor at First Medical Associates in Maryland | Specialized Care",
  "skin-rash-and-eczema":
    "Skin Rash Doctor at First Medical Associates in Maryland | Expert Diagnosis & Treatment",
  "std-testing": "STD Testing at First Medical Associates in Maryland | Discreet & Accurate Results",
  "womens-health":
    "Women's Health at First Medical Associates in Maryland | Specialized Care & Support",
};

export function buildStaticMetadata({ title, description, pathname, image } = {}) {
  const canonicalUrl = pathname ? absoluteUrl(pathname) : undefined;
  const imageUrl = image?.url
    ? image.url
    : image?.pathname
      ? absoluteUrl(image.pathname)
      : undefined;
  const images = imageUrl ? [{ url: imageUrl, alt: image?.alt || title }] : undefined;

  return {
    title,
    description,
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      url: canonicalUrl,
      title,
      description,
      images,
    },
    twitter: {
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      images,
    },
  };
}

export const providersIndexMetadata = buildStaticMetadata({
  title: "Find Doctors & Primary Care Providers in Maryland | First Medical Associates",
  description:
    "Browse primary care doctors, family medicine providers, and clinicians across Maryland locations at First Medical Associates.",
  pathname: "/providers",
});

export const servicesIndexMetadata = buildStaticMetadata({
  title: "Primary Care, Specialized Care & Telehealth Services in Maryland | First Medical Associates",
  description:
    "Explore primary care, specialized care, chronic care, telehealth, and same-day medical appointments from First Medical Associates across Maryland.",
  pathname: "/services",
});

export const locationsIndexMetadata = buildStaticMetadata({
  title: "Primary Care & Same-Day Appointment Locations in Maryland | First Medical Associates",
  description:
    "Find First Medical Associates primary care and same-day appointment locations across Maryland, with office details, directions, and appointment access.",
  pathname: "/locations",
});

export function getLocationSeoContent(location = {}) {
  const slug = cleanText(location.slug).replace(/\/+$/, "");
  const mapped = LOCATION_SEO_BY_SLUG[slug];
  const placeName = formatLocationSeoPlace(location);
  const baseDescription =
    cleanText(location.intro) ||
    cleanText(location.accent) ||
    cleanText(location.displayAddress) ||
    cleanText(location.address);

  const h1 = mapped?.h1 || `Primary care Doctor in ${placeName}`;
  const title = mapped?.title || `Primary Care Doctor in ${placeName} | First Medical Associates`;
  const description =
    truncateText(
      `Visit First Medical Associates for primary care, family medicine, and same-day appointment support in ${placeName}. ${baseDescription}`,
      160
    ) || `Visit First Medical Associates for primary care and same-day appointment support in ${placeName}.`;

  return { title, h1, description, placeLabel: placeName };
}

export function getProviderSeoContent(provider = {}) {
  const slug = cleanText(provider.slug);
  const overrides = PROVIDER_SEO_OVERRIDES[slug] || {};
  const titleName = overrides.titleName || cleanText(provider.name) || "Provider";
  const h1 = overrides.h1 || cleanText(provider.name) || "Provider";
  const description =
    truncateText(cleanText(provider.bio), 160) ||
    `${titleName} is a primary care provider at First Medical Associates.`;

  return {
    title: `${titleName} | Primary Care Doctor at First Medical Associates`,
    h1,
    description,
  };
}

export function getServiceSeoContent(service = {}) {
  const slug = cleanText(service.slug);
  const h1 = cleanText(service.title) || "Service";
  const title =
    SERVICE_SEO_TITLES_BY_SLUG[slug] ||
    `${h1} Treatment in Maryland | First Medical Associates`;
  const description =
    truncateText(cleanText(service.description), 160) ||
    `${h1} care from First Medical Associates in Maryland.`;

  return { title, h1, description };
}
