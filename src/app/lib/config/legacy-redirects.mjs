import {
  CANONICAL_ORIGIN,
  hasFileExtension,
  normalizePagePath,
} from "./site.js";

const LEGACY_BLOG_ROOT_SLUGS = [
  "5-signs-of-prediabetes",
  "5-tips-for-choosing-the-best-primary-care-doctor-for-you",
  "allergy-season-preparedness-how-to-protect-your-health-in-maryland",
  "avoid-migraine-triggers-advice-from-our-family-care-physicians",
  "back-to-school-physicals",
  "battling-the-opioid-epidemic",
  "beat-the-bugs-preventing-insect-bites-and-stings-in-the-summer",
  "beat-the-heat-your-guide-to-staying-safe-and-cool-this-summer",
  "boost-immunity-naturally-this-winter",
  "can-adults-get-allergies-our-primary-care-physicians-answer",
  "can-primary-care-take-care-of-my-geriatric-needs",
  "cholesterol-check-springville-rockville-frederick-columbia",
  "cold-and-flu-prevention-winter",
  "cold-flu-symptoms-maryland",
  "cold-vs-allergies-maryland",
  "daylight-savings-health-tips",
  "digestive-health-solutions-for-managing-gastrointestinal-issues",
  "do-you-have-these-telltale-signs-of-depression",
  "enhanced-accessibility-and-comprehensive-asthma-care",
  "expert-mens-health-care-at-first-medical-associates",
  "fall-allergies-maryland",
  "february-is-american-heart-month-prioritizing-your-heart-health",
  "fighting-cold-and-flu-season-maryland",
  "fresh-produce-and-healthy-eating-tips-for-the-season",
  "healthy-aging-stay-active-independent",
  "healthy-eating-holidays",
  "heart-health-month-maryland",
  "hormonal-health-women-maryland",
  "how-to-choose-a-weight-loss-program",
  "how-yoga-fights-back-against-arthritis",
  "managing-chronic-conditions-with-a-primary-care-doctor-in-maryland",
  "managing-public-health-emergencies-in-maryland",
  "maryland-doctors-holiday-health-guide",
  "maryland-doctors-leading-the-way",
  "maryland-doctors-paving-the-way-for-health-equity",
  "marylands-compassionate-path-to-breast-cancer-prevention",
  "memory-loss-in-the-elderly-when-to-seek-help",
  "navigating-geriatric-care-challenges-in-marylands-aging-population",
  "navigating-insurance-and-primary-care-in-maryland",
  "navigating-seasonal-allergies-with-expertise-at-first-medical-associates",
  "new-year-healthier-you-setting-realistic-health-goals-for-2025",
  "our-family-care-physicians-offer-10-tips-for-healthy-aging",
  "our-family-physicians-explain-why-you-need-a-flu-shot-every-year",
  "our-family-physicians-offer-5-tips-for-controlling-eczema-this-summer",
  "our-primary-care-doctors-suggest-avoiding-these-common-triggers-to-reduce-asthma-attacks",
  "our-primary-care-physicians-discuss-the-importance-of-having-an-annual-physical",
  "preventative-care",
  "recognizing-the-signs-of-anxiety-and-depression-when-to-seek-professional-help-in-maryland",
  "resetting-sleep-schedules-before-school",
  "same-day-appointments",
  "silent-symptoms-men-shouldnt-ignore",
  "simple-health-habits-maryland",
  "skin-cancer-awareness-understanding-the-risks-and-prevention-strategies",
  "spring-asthma-triggers-maryland",
  "stay-on-top-of-your-health-this-year-schedule-your-yearly-checkup-with-your-primary-care-doctor",
  "staying-hydrated-how-much-water-do-you-really-need-in-the-summer",
  "streamlining-patient-care-f-m-as-innovative-healthcare-solutions",
  "strengthening-bones-with-first-medical-associates-a-unified-approach-to-osteoporosis-prevention",
  "suffering-from-long-haul-covid-theres-help",
  "summer-diabetes-tips",
  "sun-safety-tips-summer",
  "telemedicine-and-primary-care",
  "the-benefits-of-our-telehealth-services",
  "the-connection-between-sore-throats-and-seasonal-changes",
  "the-impact-of-stress-on-health-how-marylands-primary-care-doctors-can-help",
  "the-importance-of-annual-physicals-for-maryland-residents",
  "the-importance-of-cultural-competence-in-primary-care-enhancing-patient-care-at-first-medical-associates",
  "the-importance-of-preventative-care-tips-from-marylands-leading-primary-care-physicians",
  "the-rise-of-telemedicine-and-telehealth-in-maryland",
  "travel-health-essentials-staying-well-on-summer-vacations",
  "understanding-eczema-from-causes-to-treatment-and-everything-in-between",
  "understanding-the-differences-between-type-1-and-type-2-diabetes-2",
  "understanding-the-link-between-mental-health-and-physical-well-being",
  "vitamin-d-seasonal-health-maryland",
  "what-you-can-do-to-manage-diabetes-and-prevent-complications",
  "why-a-medical-weight-loss-program-with-your-family-doctor-is-a-good-idea",
  "why-choose-first-medical-associates-for-your-primary-care-needs-in-maryland",
  "why-do-i-need-preventive-health-screenings",
  "why-early-diagnosis-of-arthritis-from-our-primary-care-physicians-is-so-important",
  "why-everyone-gets-sick-when-school-starts",
  "winter-wellness-mental-physical-health",
];

const LEGACY_PROVIDER_ROOT_SLUGS = [
  "alexander-jimenez",
  "amit-s-babra",
  "anna-docktor-2",
  "chelsea-uwanaka",
  "christopher-costa",
  "david-clark",
  "elesa-yihdego",
  "faith-kim",
  "grace-nzouatcham",
  "ilan-kokotek-2",
  "janelle-dennis",
  "katayoun-khosravani",
  "kyneisha-watson",
  "lily-grainger-2",
  "liu-manchang-2",
  "maria-munoz-md",
  "marili-lemus",
  "monica-braland",
  "owen-glister-2",
  "paula-moon-2",
  "robin-codjoe",
  "susana-beza-2",
];

function pageRedirect(source, destination) {
  return {
    source: normalizePagePath(source),
    destination: normalizePagePath(destination),
  };
}

function fileRedirect(source, destination) {
  return { source, destination };
}

export const LEGACY_REDIRECTS = [
  pageRedirect("/service", "/services"),
  pageRedirect("/location", "/locations"),
  pageRedirect("/about-us", "/about"),
  pageRedirect("/contact-us", "/contact"),
  pageRedirect("/jobs", "/about/careers"),
  pageRedirect("/resources", "/patient-resources"),
  pageRedirect("/insurances", "/patient-resources/insurance"),
  pageRedirect("/billing-questions", "/patient-resources/insurance"),
  pageRedirect("/accessibility-notice", "/accessibility"),
  pageRedirect("/columbia", "/location/columbia"),
  pageRedirect("/columbia-dev", "/columbia-2"),
  pageRedirect("/bowie-dev", "/bowie-2"),
  pageRedirect("/location/columbia-oldie-oldie", "/location/columbia"),

  pageRedirect(
    "/blog/navigating-healthcare-choices-in-maryland-er-urgent-care-and-primary-doctor",
    "/blog/navigating-healthcare-choices-in-maryland-er-specialized-care-and-primary-doctor"
  ),
  pageRedirect(
    "/navigating-healthcare-choices-in-maryland-er-urgent-care-and-primary-doctor",
    "/blog/navigating-healthcare-choices-in-maryland-er-specialized-care-and-primary-doctor"
  ),
  pageRedirect(
    "/blog/why-first-medical-associates-is-your-go-to-walk-in-clinic-for-convenient-quality-care",
    "/blog/why-first-medical-associates-is-your-go-to-for-same-day-appointments"
  ),
  pageRedirect(
    "/why-first-medical-associates-is-your-go-to-walk-in-clinic-for-convenient-quality-care",
    "/blog/why-first-medical-associates-is-your-go-to-for-same-day-appointments"
  ),
  pageRedirect(
    "/summer-hydration-how-much-water-do-you-need",
    "/blog/staying-hydrated-how-much-water-do-you-really-need-in-the-summer"
  ),
  pageRedirect(
    "/summer-hydration-how-much-water-do-you-really-need",
    "/blog/staying-hydrated-how-much-water-do-you-really-need-in-the-summer"
  ),

  pageRedirect("/anita-kunwar-md", "/providers/anita-kunwar"),
  pageRedirect("/providers/anita-kunwar-md", "/providers/anita-kunwar"),
  pageRedirect("/provider/leanne-antioquia-fnp-c", "/providers/leanne-antioquia"),
  pageRedirect("/providers/costa-md", "/providers/christopher-costa"),
  pageRedirect("/providers-old/ronald-thomas", "/providers/ronald-thomas"),

  pageRedirect("/annapolis-staff", "/location/annapolis"),
  pageRedirect("/bowie-staff", "/location/bowie"),
  pageRedirect("/columbia-staff", "/location/columbia"),
  pageRedirect("/frederick-staff", "/location/frederick"),
  pageRedirect("/gaithersburg-staff", "/location/gaithersburg"),
  pageRedirect("/gallant-staff", "/location/bowie"),
  pageRedirect("/germantown-staff", "/location/germantown"),
  pageRedirect("/glen-burnie-staff", "/location/glen-burnie"),
  pageRedirect("/nottingham-staff", "/location/nottingham"),
  pageRedirect("/rockville-staff", "/location/rockville"),
  pageRedirect("/severna-park-staff", "/location/severna-park"),
  pageRedirect("/silver-spring-staff", "/location/silver-spring"),

  pageRedirect("/service/adhd", "/service/primary-care"),
  pageRedirect("/service/anxiety", "/service/depression"),
  pageRedirect("/service/arthritis", "/service/primary-care"),
  pageRedirect("/service/eczema", "/service/skin-rash-and-eczema"),
  pageRedirect("/service/migraines", "/service/primary-care"),
  pageRedirect("/service/walk-in-services", "/service/same-day-care"),
  pageRedirect("/service/urgent-needs", "/service/same-day-care"),

  ...LEGACY_BLOG_ROOT_SLUGS.map((slug) => pageRedirect(`/${slug}`, `/blog/${slug}`)),
  ...LEGACY_PROVIDER_ROOT_SLUGS.map((slug) =>
    pageRedirect(`/${slug}`, `/providers/${slug}`)
  ),

  fileRedirect(
    "/wp-content/uploads/2026/02/Late-Arrival-Policy-1.pdf",
    "/wp-content/uploads/2026/07/Late-Arrival-Policy-FMA_07-17-2026.docx-2.pdf"
  ),
];

function comparablePath(value) {
  return String(value || "").replace(/\/+$/, "") || "/";
}

export function validateRedirectManifest(entries = LEGACY_REDIRECTS) {
  const sourcePaths = new Set();

  for (const entry of entries) {
    if (!entry?.source?.startsWith("/") || !entry?.destination?.startsWith("/")) {
      throw new Error(`Redirects must use internal absolute paths: ${JSON.stringify(entry)}`);
    }

    const source = comparablePath(entry.source);
    const destination = comparablePath(entry.destination);

    if (sourcePaths.has(source)) {
      throw new Error(`Duplicate redirect source: ${entry.source}`);
    }
    if (source === destination) {
      throw new Error(`Self redirect is not allowed: ${entry.source}`);
    }

    sourcePaths.add(source);
  }

  for (const entry of entries) {
    if (sourcePaths.has(comparablePath(entry.destination))) {
      throw new Error(`Redirect target must be final, not another redirect: ${entry.destination}`);
    }
  }

  return true;
}

export function buildLegacyRedirects(entries = LEGACY_REDIRECTS) {
  validateRedirectManifest(entries);

  return entries.flatMap((entry) => {
    const redirect = { destination: entry.destination, permanent: true };

    if (hasFileExtension(entry.source)) {
      return [{ source: entry.source, ...redirect }];
    }

    const withoutTrailingSlash = comparablePath(entry.source);
    return [
      { source: withoutTrailingSlash, ...redirect },
      { source: normalizePagePath(withoutTrailingSlash), ...redirect },
    ];
  });
}

export const WWW_TO_APEX_REDIRECT = {
  source: "/:path*/",
  has: [{ type: "host", value: "www.drsfirst.com" }],
  destination: `${CANONICAL_ORIGIN}/:path*/`,
  permanent: true,
};

export const WWW_TO_APEX_FALLBACK_REDIRECT = {
  source: "/:path*",
  has: [{ type: "host", value: "www.drsfirst.com" }],
  destination: `${CANONICAL_ORIGIN}/:path*`,
  permanent: true,
};
