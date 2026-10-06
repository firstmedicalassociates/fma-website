import { GENERAL_BOOK_APPOINTMENT_URL, normalizeInternalPageHref } from "./config/site.js";
import serviceAvailability from "./service-availability.cjs";

export function getServiceDetailNavigation(locationContext = null, serviceSlug = "") {
  if (serviceSlug === serviceAvailability.MEDICAL_WEIGHT_LOSS_SLUG) {
    return {
      appointmentHref: GENERAL_BOOK_APPOINTMENT_URL,
      secondaryHref: "/locations/",
      heroSecondaryLabel: "View Locations",
      ctaSecondaryLabel: "View Locations",
      relatedLinks: [
        ...serviceAvailability.MEDICAL_WEIGHT_LOSS_LOCATIONS.map((office) => ({
          href: normalizeInternalPageHref(office.slug),
          label: `${office.title.split(",")[0]} Office`,
          description: "GLP-1 / Medical Weight Loss Management is available at this office. View office details and scheduling options.",
        })),
        {
          href: "/services/",
          label: "Browse All Services",
          description: "Explore other FMA services. Availability varies by service and location.",
        },
        {
          href: "/patient-resources/education/",
          label: "Patient Education",
          description: "Explore general health information and patient resources.",
        },
      ],
    };
  }
  if (locationContext) {
    const officeHref = normalizeInternalPageHref(locationContext.slug);
    const officeName = String(locationContext.title || "Local").split(",")[0].trim();
    return {
      appointmentHref: String(locationContext.bookingUrl || "").trim() || officeHref,
      secondaryHref: officeHref,
      heroSecondaryLabel: `View ${officeName} Office`,
      ctaSecondaryLabel: `View ${officeName} Office`,
      relatedLinks: [
        {
          href: officeHref,
          label: `${officeName} Office`,
          description: `This service is offered at our ${officeName} office. View office details and scheduling options.`,
        },
        {
          href: "/services/",
          label: "Browse All Services",
          description: "Explore other FMA services. Availability varies by service and location.",
        },
        {
          href: "/patient-resources/education/",
          label: "Patient Education",
          description: "Explore general health information and patient resources.",
        },
      ],
    };
  }

  return {
    appointmentHref: GENERAL_BOOK_APPOINTMENT_URL,
    secondaryHref: "/providers/",
    heroSecondaryLabel: "Find a Primary Care Provider",
    ctaSecondaryLabel: "Find a Provider",
    relatedLinks: [
      {
        href: "/providers/",
        label: "Find a Provider",
        description: "Browse primary care providers who can help with this service.",
      },
      {
        href: "/locations/",
        label: "Find a Location",
        description: "See clinic locations across Maryland and Northern Virginia where you can book care.",
      },
      {
        href: "/services/",
        label: "Browse All Services",
        description: "Compare related treatment options, chronic care, specialized care, and telehealth.",
      },
      {
        href: "/patient-resources/insurance/",
        label: "Check Insurance",
        description: "Review accepted insurance plans before scheduling your appointment.",
      },
    ],
  };
}
