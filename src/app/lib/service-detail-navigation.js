import { GENERAL_BOOK_APPOINTMENT_URL, normalizeInternalPageHref } from "./config/site.js";
import serviceAvailability from "./service-availability.cjs";

export function getServiceDetailNavigation(locationContext = null) {
  if (locationContext) {
    const officeHref = normalizeInternalPageHref(locationContext.slug);
    const officeName = String(locationContext.title || "Severna Park").split(",")[0].trim();
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
        ...(locationContext.slug === serviceAvailability.SEVERNA_PARK_SLUG
          ? serviceAvailability.MEDICAL_WEIGHT_LOSS_LOCATIONS.slice(1).map((office) => ({
              href: normalizeInternalPageHref(office.slug),
              label: `${office.title.split(",")[0]} Office`,
              description: "GLP-1 / Medical Weight Loss Management is also available at this office. View office details and scheduling options.",
            }))
          : []),
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
