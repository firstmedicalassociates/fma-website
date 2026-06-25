export const BLOG_CATEGORY_OPTIONS = [
  {
    value: "Primary Care",
    slug: "primary-care",
    label: "PRIMARY CARE",
    navTitle: "Primary Care",
    description:
      "Practical guidance on preventive care, annual visits, everyday symptoms, and building a strong relationship with your care team.",
  },
  {
    value: "Heart Health",
    slug: "heart-health",
    label: "HEART HEALTH",
    navTitle: "Heart Health",
    description:
      "Articles focused on cardiovascular wellness, cholesterol, blood pressure, screenings, and heart-healthy habits.",
  },
  {
    value: "Weight Management",
    slug: "weight-management",
    label: "WEIGHT MANAGEMENT",
    navTitle: "Weight Management",
    description:
      "Support for healthy eating, sustainable weight goals, nutrition, activity, and long-term lifestyle change.",
  },
  {
    value: "Women's Health",
    slug: "womens-health",
    label: "WOMEN'S HEALTH",
    navTitle: "Women's Health",
    description:
      "Resources for women's preventive care, hormonal health, screenings, and health needs through every stage of life.",
  },
  {
    value: "Mental Wellness",
    slug: "mental-wellness",
    label: "MENTAL WELLNESS",
    navTitle: "Mental Wellness",
    description:
      "Guidance for sleep, stress, mood, seasonal wellness, emotional health, and whole-person well-being.",
  },
];

export const DEFAULT_BLOG_CATEGORY = BLOG_CATEGORY_OPTIONS[0].value;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export function findBlogCategoryOption(value) {
  const normalized = normalizeText(value);

  return BLOG_CATEGORY_OPTIONS.find(
    (option) =>
      normalizeText(option.value) === normalized ||
      normalizeText(option.slug) === normalized ||
      normalizeText(option.label) === normalized
  );
}

export function getBlogCategoryOption(value) {
  return findBlogCategoryOption(value) || BLOG_CATEGORY_OPTIONS[0];
}

export function getBlogCategoryFromSlug(slug) {
  return getBlogCategoryOption(slug);
}

export function normalizeBlogCategory(value) {
  return getBlogCategoryOption(value).value;
}

export function isBlogCategoryCompatibilityError(error) {
  const message = String(error?.message || "");
  const column = String(error?.meta?.column || "");

  return (
    message.includes("Unknown field `category`") ||
    message.includes("Unknown argument `category`") ||
    message.includes("Unknown arg `category`") ||
    (error?.code === "P2022" && column.toLowerCase().includes("category")) ||
    (message.toLowerCase().includes("column") && message.toLowerCase().includes("category"))
  );
}

export function inferBlogCategory(post = {}) {
  const text = [
    post.title,
    post.excerpt,
    post.metaDescription,
    post.contentHtml,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    /\b(woman|women|female|hormone|hormonal|menopause|pregnancy|mammogram|gynecology)\b/.test(
      text
    )
  ) {
    return "Women's Health";
  }

  if (/\b(heart|cardio|cardiovascular|cholesterol|blood pressure|hypertension)\b/.test(text)) {
    return "Heart Health";
  }

  if (/\b(weight|weight loss|nutrition|diet|healthy eating|balanced plate|obesity)\b/.test(text)) {
    return "Weight Management";
  }

  if (/\b(mental|mood|depression|anxiety|stress|sleep|winter blues|migraine)\b/.test(text)) {
    return "Mental Wellness";
  }

  return DEFAULT_BLOG_CATEGORY;
}
