"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { PATIENT_PORTAL_URL } from "../lib/config/site";
import { buildDisplayAddress, formatOfficeHoursForDisplay, resolveLocationAddressParts } from "../lib/locations";
import { normalizeServiceIcon } from "../lib/services";
import styles from "./location-page.module.css";

const TABS = [
  { id: "location", label: "01. Location" },
  { id: "doctors", label: "02. Doctors" },
  { id: "services", label: "03. Services" },
  { id: "info", label: "04. Info" },
];

const INFO_FAQS = [
  {
    q: "What services are available at the walk-in clinic?",
    a: "We offer treatment for acute illnesses, minor injuries, and preventative care.",
  },
  {
    q: "Do I need an appointment for urgent care?",
    a: "No appointment is necessary for our walk-in urgent care services.",
  },
  {
    q: "Do you offer family medicine for children and adults?",
    a: "Yes, our family medicine practitioners see patients of all ages.",
  },
  {
    q: "How do referrals to specialists work?",
    a: "Our primary care providers coordinate referrals to trusted specialists in our network when needed.",
  },
  {
    q: "Are same-day or next-day appointments available?",
    a: "Yes, we strive to offer same-day and next-day scheduling for our established patients.",
  },
];

const WHY_PATIENTS_CHOOSE_ITEMS = [
  "Patient-centered care tailored to your individual needs",
  "Connected, coordinated care across our network",
  "Access to hundreds of distinguished specialists",
  "Same-day and next-day appointments available",
  "After-hours on-call providers when you need us",
];

function formatAddressLines(location) {
  const displayAddress = String(location.displayAddress || "").trim();
  if (displayAddress) {
    return displayAddress.split(/\n+/).filter(Boolean);
  }

  const generatedDisplayAddress = buildDisplayAddress(resolveLocationAddressParts(location));
  if (generatedDisplayAddress) {
    return generatedDisplayAddress.split(/\n+/).filter(Boolean);
  }

  return String(location.address || "")
    .split(/,\s*/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function isTelehealthService(service = {}) {
  const category = String(service.category || "").toLowerCase();
  const title = String(service.title || "").toLowerCase();
  return category.includes("tele") || title.includes("tele");
}

function normalizeCategory(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function getCategoryVariant(category = "") {
  const key = normalizeCategory(category);

  if (key.includes("primary care")) return "primary";
  if (key.includes("chronic")) return "chronic";
  if (key.includes("specialized")) return "specialized";
  if (key.includes("general")) return "general";
  if (key.includes("tele")) return "telehealth";

  return "default";
}

function getCategoryPillClass(stylesModule, category = "") {
  const variant = getCategoryVariant(category);
  const map = {
    primary: stylesModule.serviceFinderCategoryPrimary,
    chronic: stylesModule.serviceFinderCategoryChronic,
    specialized: stylesModule.serviceFinderCategorySpecialized,
    general: stylesModule.serviceFinderCategoryGeneral,
    telehealth: stylesModule.serviceFinderCategoryTelehealth,
    default: stylesModule.serviceFinderCategoryDefault,
  };

  return map[variant] || stylesModule.serviceFinderCategoryDefault;
}

export default function LocationPageShell({ location, providers, serviceGroups }) {
  const [activeTab, setActiveTab] = useState("location");
  const [serviceQuery, setServiceQuery] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [activeFaq, setActiveFaq] = useState(0);
  const [infoFormStatus, setInfoFormStatus] = useState("idle");
  const [infoFormMessage, setInfoFormMessage] = useState("");
  const [infoFormValues, setInfoFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    message: "",
  });

  const addressLines = useMemo(() => formatAddressLines(location), [location]);
  const officeHourRows = useMemo(
    () => formatOfficeHoursForDisplay(location.officeHours),
    [location.officeHours]
  );
  const serviceEntries = useMemo(() => {
    return (Array.isArray(serviceGroups) ? serviceGroups : []).flatMap((group) => {
      const category = String(group?.category || "General Care").trim() || "General Care";
      const items = Array.isArray(group?.items) ? group.items : [];
      return items.map((service) => ({
        ...service,
        category,
      }));
    });
  }, [serviceGroups]);
  const serviceFilters = useMemo(() => {
    const seen = new Set();
    const ordered = [];
    for (const service of serviceEntries) {
      const category = String(service.category || "").trim();
      if (!category) continue;
      const normalized = category.toLowerCase();
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      ordered.push(category);
    }
    return ordered;
  }, [serviceEntries]);
  const infoSections = useMemo(() => {
    if (!Array.isArray(location.infoSections)) return [];

    return location.infoSections
      .map((section) => {
        const title = String(section?.title || "").trim();
        const paragraphs = Array.isArray(section?.paragraphs)
          ? section.paragraphs.map((item) => String(item || "").trim()).filter(Boolean)
          : [];

        if (!title || paragraphs.length === 0) return null;

        return {
          key: String(section?.key || title).trim().toLowerCase().replace(/\s+/g, "-"),
          title,
          paragraphs,
        };
      })
      .filter(Boolean);
  }, [location.infoSections]);
  const locationSeoPlaceLabel = location.seoPlaceLabel || location.title;
  const infoTemplateContent = useMemo(() => {
    const getSection = (matchers = []) => {
      return infoSections.find((section) => {
        const title = String(section.title || "").toLowerCase();
        const key = String(section.key || "").toLowerCase();
        return matchers.some((matcher) => title.includes(matcher) || key.includes(matcher));
      });
    };

    const walkIn = getSection(["walk-in clinic", "walk in clinic", "walk-in"]);
    const family = getSection(["family doctor", "family"]);
    const doctors = getSection(["doctors in", "doctors"]);
    const primary = getSection(["primary care", "primary"]);
    const geriatric = getSection(["geriatric care", "geriatric"]);

    const primaryCareTitle = primary?.title || "Primary Care";
    const primaryCareDescription = primary?.paragraphs?.join(" ") || "";
    const geriatricTitle = geriatric?.title || "Geriatric Care";
    const geriatricDescription = geriatric?.paragraphs?.join(" ") || "";

    return {
      walkIn: {
        title: walkIn?.title || `Walk-in Clinic in ${locationSeoPlaceLabel}`,
        description:
          walkIn?.paragraphs?.join(" ") ||
          "Our walk-in clinic delivers immediate care for urgent health needs with no appointment necessary.",
      },
      family: {
        title: family?.title || `Family Doctor in ${locationSeoPlaceLabel}`,
        description:
          family?.paragraphs?.join(" ") ||
          "We provide dependable, family-centered care for all ages, from children to older adults.",
      },
      doctors: {
        title: doctors?.title || `Doctors in ${locationSeoPlaceLabel}`,
        description:
          doctors?.paragraphs?.join(" ") ||
          "Our physicians focus on whole-person care with preventive services and modern clinical support.",
      },
      primary: {
        title: primaryCareTitle,
        description: primaryCareDescription,
      },
      geriatric: {
        title: geriatricTitle,
        description: geriatricDescription,
      },
    };
  }, [infoSections, location.title, locationSeoPlaceLabel]);
  const filteredServices = useMemo(() => {
    const query = serviceQuery.trim().toLowerCase();
    return serviceEntries.filter((service) => {
      const matchesFilter =
        serviceFilter === "all" ||
        String(service.category || "").toLowerCase() === serviceFilter;

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        String(service.title || "").toLowerCase().includes(query) ||
        String(service.description || "").toLowerCase().includes(query) ||
        String(service.category || "").toLowerCase().includes(query)
      );
    });
  }, [serviceEntries, serviceFilter, serviceQuery]);
  const publicPhone = location.publicPhone || "";
  const patientPortalUrl = PATIENT_PORTAL_URL;
  const hasPatientPortalLink = Boolean(patientPortalUrl && patientPortalUrl !== "#");

  async function handleInfoFormSubmit(event) {
    event.preventDefault();
    setInfoFormStatus("sending");
    setInfoFormMessage("");

    try {
      const response = await fetch("/api/location-info-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...infoFormValues,
          locationTitle: location.title,
          locationSlug: location.slug,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        setInfoFormStatus("error");
        setInfoFormMessage(payload.error || "Unable to send your message right now.");
        return;
      }

      setInfoFormStatus("success");
      setInfoFormMessage("Thanks. Your message was sent to our care team.");
      setInfoFormValues({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch {
      setInfoFormStatus("error");
      setInfoFormMessage("Unable to send your message right now.");
    }
  }

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.main}>
        <section className={styles.tabShell}>
          <div className={styles.tabNavWrap}>
            <div className={styles.tabNav} role="tablist" aria-label="Location content tabs">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ""}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === "location" ? (
            <section className={styles.locationPanel}>
              <div className={styles.locationCopy}>
                <div className={styles.locationIntro}>
                  <p className={styles.stageLabel}>{location.eyebrow || "Stage 01: Visit Our Hub"}</p>
                  <h1 className={styles.locationTitle}>{location.seoH1 || location.title}</h1>
                  <p className={styles.locationAccent}>
                    {location.accent || location.intro || "Personalized primary care close to home."}
                  </p>
                </div>

                <div className={styles.infoStack}>
                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>01</div>
                    <div>
                      <h2>Clinic Address</h2>
                      <div className={styles.addressBlock}>
                        {addressLines.length > 0 ? (
                          addressLines.map((line) => <p key={line}>{line}</p>)
                        ) : (
                          <p>Address information is currently unavailable.</p>
                        )}
                      </div>
                      {location.directionsUrl ? (
                        <a href={location.directionsUrl} target="_blank" rel="noreferrer">
                          Get Directions
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className={styles.infoCard}>
                    <div className={styles.infoIcon}>02</div>
                    <div>
                      <h2>Patient Hours</h2>
                      <div className={styles.hoursList}>
                        {officeHourRows.length > 0 ? (
                          officeHourRows.map((hours) => <p key={hours}>{hours}</p>)
                        ) : (
                          <p>Office hours are currently unavailable.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.infoCard}>
                  <div className={styles.infoIcon}>03</div>
                  <div>
                    <h2>Resources</h2>
                    <div className={styles.resourceLinks}>
                      {location.bookingUrl ? (
                        <a className={`${styles.resourceLink} ${styles.resourceLinkPrimary}`} href={location.bookingUrl} target="_blank" rel="noreferrer">
                          Book Appointment
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkPrimary} ${styles.resourceLinkDisabled}`}>
                          Book Appointment
                        </span>
                      )}
                      {hasPatientPortalLink ? (
                        <a
                          className={`${styles.resourceLink} ${styles.resourceLinkSecondary}`}
                          href={patientPortalUrl}
                          target={patientPortalUrl.startsWith("http") ? "_blank" : undefined}
                          rel={patientPortalUrl.startsWith("http") ? "noreferrer" : undefined}
                        >
                          Patient Portal
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkSecondary} ${styles.resourceLinkDisabled}`}>
                          Patient Portal
                        </span>
                      )}
                      {location.reviewUrl ? (
                        <a className={`${styles.resourceLink} ${styles.resourceLinkSecondary}`} href={location.reviewUrl} target="_blank" rel="noreferrer">
                          Leave a Review
                        </a>
                      ) : (
                        <span className={`${styles.resourceLink} ${styles.resourceLinkSecondary} ${styles.resourceLinkDisabled}`}>
                          Leave a Review
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.locationMedia}>
                <div className={styles.locationMediaCard}>
                  {location.imageUrl ? (
                    <img
                      className={styles.mediaImage}
                      src={location.imageUrl}
                      alt={location.mapImageAlt}
                    />
                  ) : (
                    <div className={styles.mediaPlaceholder}>Location image is currently unavailable.</div>
                  )}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "doctors" ? (
            <section className={styles.doctorsPanel}>
              <div className={styles.panelIntro}>
                <p className={styles.stageLabel}>Stage 02: Our Specialists</p>
                <h2>Providers at {location.title}</h2>
                <p>Meet the providers currently available at this location.</p>
              </div>

              {providers.length === 0 ? (
                <div className={styles.emptyState}>
                  No providers are assigned to this location yet.
                </div>
              ) : (
                <div className={styles.providerGrid}>
                  {providers.map((provider) => (
                    <article key={provider.slug} className={styles.providerCard}>
                      <div className={styles.providerAvatarWrap}>
                        <img
                          className={styles.providerAvatar}
                          src={provider.imageUrl}
                          alt={provider.imageAlt}
                        />
                      </div>
                      <h3>{provider.name}</h3>
                      <p>{provider.title}</p>
                      <div className={styles.providerActions}>
                        <Link href={provider.profileHref}>View Profile</Link>
                        <a
                          href={provider.ctaHref}
                          target={provider.ctaHref.startsWith("http") ? "_blank" : undefined}
                          rel={provider.ctaHref.startsWith("http") ? "noreferrer" : undefined}
                        >
                          {provider.ctaLabel}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              <div className={styles.panelFooter}>
                <button className={styles.inlineTabCta} type="button" onClick={() => setActiveTab("services")}>
                  Next: Explore Services
                </button>
              </div>
            </section>
          ) : null}

          {activeTab === "services" ? (
            <section className={styles.servicesPanel}>
              <div className={styles.servicesHero}>
                <div className={styles.servicesHeroPrimary}>
                  <p className={styles.servicesHeroKicker}>Interactive Portal</p>
                  <h2 className={styles.servicesHeroTitle}>
                    Service Finder
                    <br />
                    Dashboard.
                  </h2>
                </div>
                <div className={styles.servicesHeroSecondary}>
                  <p>
                    Seamlessly navigate our clinical offerings at {location.title}. Use the
                    dashboard below to search, filter, and discover the exact care you need.
                  </p>
                  <div className={styles.servicesHeroLines}>
                    <span />
                    <span />
                  </div>
                </div>
              </div>

              {serviceEntries.length === 0 ? (
                <div className={styles.emptyState}>
                  No services have been added to this location yet.
                </div>
              ) : (
                <>
                  <div className={styles.servicesToolbar}>
                    <div className={styles.servicesSearchWrap}>
                      <span className={`material-symbols-outlined ${styles.servicesSearchIcon}`}>
                        search
                      </span>
                      <input
                        className={styles.servicesSearchInput}
                        type="search"
                        placeholder="Search services (e.g., Diabetes, Telemedicine)"
                        value={serviceQuery}
                        onChange={(event) => setServiceQuery(event.target.value)}
                        aria-label="Search services"
                      />
                    </div>

                    <div className={styles.servicesFilterRow}>
                      <span className={styles.servicesFilterLabel}>Filter By:</span>
                      <button
                        type="button"
                        className={`${styles.servicesFilterPill} ${serviceFilter === "all" ? styles.servicesFilterPillActive : ""}`}
                        onClick={() => setServiceFilter("all")}
                      >
                        All Services
                      </button>
                      {serviceFilters.map((category) => {
                        const value = category.toLowerCase();
                        return (
                          <button
                            key={category}
                            type="button"
                            className={`${styles.servicesFilterPill} ${serviceFilter === value ? styles.servicesFilterPillActive : ""}`}
                            onClick={() => setServiceFilter(value)}
                          >
                            {category}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredServices.length === 0 ? (
                    <div className={styles.emptyState}>
                      No services match your search. Try a different term or filter.
                    </div>
                  ) : (
                    <div className={styles.serviceFinderGrid}>
                      {filteredServices.map((service) => {
                        const telehealth = isTelehealthService(service);
                        const categoryPillClass = getCategoryPillClass(styles, service.category);
                        return (
                          <article
                            key={`${service.category}-${service.title}`}
                            className={`${styles.serviceFinderCard} ${telehealth ? styles.serviceFinderCardHighlight : ""}`}
                          >
                            <div>
                              <div className={styles.serviceFinderCardHeader}>
                                <span className={`material-symbols-outlined ${styles.serviceFinderIcon}`}>
                                  {normalizeServiceIcon(service.icon)}
                                </span>
                                <p className={`${styles.serviceFinderCategory} ${categoryPillClass}`}>
                                  {service.category}
                                </p>
                              </div>
                              <h3>{service.title}</h3>
                              <p>{service.description}</p>
                            </div>
                            <div className={styles.serviceFinderAction}>
                              {telehealth ? "Launch Visit" : "Learn More"}
                              <span className="material-symbols-outlined">arrow_forward</span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              <div className={styles.primaryBanner}>
                <div>
                  <p className={styles.stageLabel}>Need immediate clinical assistance?</p>
                  <h2>Connect with the care team at {location.title}.</h2>
                </div>
                <div className={styles.bannerActions}>
                  {location.bookingUrl ? (
                    <a href={location.bookingUrl} target="_blank" rel="noreferrer">
                      Book Your Visit
                    </a>
                  ) : null}
                  {publicPhone ? (
                    <a href={`tel:${publicPhone.replace(/[^\d+]/g, "")}`}>Call {publicPhone}</a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {activeTab === "info" ? (
            <section className={styles.infoPanel}>
              <div className={styles.infoIntroSection}>
                <div className={styles.infoIntroCopy}>
                  <h1 className={styles.locationTitle}>{location.seoH1 || location.title}</h1>
                  <p className={styles.locationAccent}>
                    {location.accent || location.intro || "Personalized primary care close to home."}
                  </p>
                  <div className={styles.infoIntroActions}>
                    {publicPhone ? (
                      <a href={`tel:${publicPhone.replace(/[^\d+]/g, "")}`} className={`${styles.primaryCta}`}>
                        Call Now
                      </a>
                    ) : null}
                    {location.directionsUrl ? (
                      <a href={location.directionsUrl} target="_blank" rel="noreferrer" className={`${styles.secondaryCta}`}>
                        Get Directions
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className={styles.infoIntroSidebar}>
                  <div className={styles.infoPanelSidebarCard}>
                    <div className={styles.infoPanelInfoItem}>
                      <div className={styles.infoPanelInfoIcon}>
                        <span className="material-symbols-outlined">calendar_month</span>
                      </div>
                      <div>
                        <h3>Walk-In Clinic</h3>
                        <p>No appointment needed for urgent care</p>
                      </div>
                    </div>

                    <div className={styles.infoPanelInfoItem}>
                      <div className={styles.infoPanelInfoIcon}>
                        <span className="material-symbols-outlined">groups</span>
                      </div>
                      <div>
                        <h3>Family Doctors</h3>
                        <p>Treated primary care for the whole family</p>
                      </div>
                    </div>

                    <div className={styles.infoPanelInfoItem}>
                      <div className={styles.infoPanelInfoIcon}>
                        <span className="material-symbols-outlined">schedule</span>
                      </div>
                      <div>
                        <h3>Same-Day Access</h3>
                        <p>Same-day or next-day appointments available</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.infoFeatureSplit}>
                <article className={styles.infoFeatureCard}>
                  <div className={styles.infoFeatureTitleRow}>
                    <div className={styles.infoFeatureIconWrap}>
                      <span className="material-symbols-outlined">calendar_month</span>
                    </div>
                    <h2>{infoTemplateContent.walkIn.title}</h2>
                  </div>
                  <p>{infoTemplateContent.walkIn.description}</p>
                  <div className={styles.infoFeatureMetaGrid}>
                    <div className={styles.infoFeatureMetaItem}>
                      <span className="material-symbols-outlined">schedule</span>
                      <span>Fast, on-site care when you need it</span>
                    </div>
                    <div className={styles.infoFeatureMetaItem}>
                      <span className="material-symbols-outlined">verified_user</span>
                      <span>Experience you can trust</span>
                    </div>
                    <div className={styles.infoFeatureMetaItem}>
                      <span className="material-symbols-outlined">favorite</span>
                      <span>Compassionate care for all</span>
                    </div>
                  </div>
                </article>

                <article className={styles.infoWhyCard}>
                  <h3>
                    Why Patients Choose
                    <br />
                    First Medical Associates
                  </h3>
                  <ul className={styles.infoWhyList}>
                    {WHY_PATIENTS_CHOOSE_ITEMS.map((item) => (
                      <li key={item}>
                        <span className="material-symbols-outlined">check_circle</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              </div>

              <article className={styles.infoFaqCard}>
                  <h2>Frequently Asked Questions</h2>
                  <div className={styles.infoFaqList}>
                    {INFO_FAQS.map((faq, index) => {
                      const isOpen = activeFaq === index;
                      return (
                        <div
                          key={faq.q}
                          className={`${styles.infoFaqItem} ${isOpen ? styles.infoFaqItemActive : ""}`}
                        >
                          <button
                            type="button"
                            className={styles.infoFaqButton}
                            onClick={() => setActiveFaq(isOpen ? -1 : index)}
                          >
                            <div className={styles.infoFaqQuestionWrap}>
                              <span className={styles.infoFaqDot}>?</span>
                              <span>{faq.q}</span>
                            </div>
                            <span
                              className={`material-symbols-outlined ${styles.infoFaqChevron} ${
                                isOpen ? styles.infoFaqChevronActive : ""
                              }`}
                            >
                              expand_more
                            </span>
                          </button>
                          <div className={`${styles.infoFaqAnswerWrap} ${isOpen ? styles.infoFaqAnswerWrapOpen : ""}`}>
                            <p>{faq.a}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>

              <div className={styles.infoSectionGrid}>
                <article className={`${styles.infoSectionCard} ${styles.infoSectionCardPrimary}`}>
                  <div className={styles.infoSectionHeader}>
                    <div className={styles.infoSectionIcon}>
                      <span className="material-symbols-outlined">health_and_safety</span>
                    </div>
                    <h3>Primary Care & Geriatric Care</h3>
                  </div>
                  <div className={styles.infoSectionBody}>
                    <p>{infoTemplateContent.primary.description || infoTemplateContent.geriatric.description}</p>
                  </div>
                </article>

                <article className={styles.infoSectionCard}>
                  <div className={styles.infoSectionHeader}>
                    <div className={styles.infoSectionIcon}>
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <h3>{infoTemplateContent.family.title}</h3>
                  </div>
                  <div className={styles.infoSectionBody}>
                    <p>{infoTemplateContent.family.description}</p>
                  </div>
                </article>

                <article className={styles.infoSectionCard}>
                  <div className={styles.infoSectionHeader}>
                    <div className={styles.infoSectionIcon}>
                      <span className="material-symbols-outlined">medical_services</span>
                    </div>
                    <h3>{infoTemplateContent.doctors.title}</h3>
                  </div>
                  <div className={styles.infoSectionBody}>
                    <p>{infoTemplateContent.doctors.description}</p>
                  </div>
                </article>
              </div>

              <section className={styles.infoResourceSection}>
                <h2>Featured Care & Resources</h2>
                <div className={styles.infoResourceGrid}>
                  <article className={styles.infoResourceCard}>
                    <div className={styles.infoResourceIcon}>
                      <span className="material-symbols-outlined">group</span>
                    </div>
                    <div>
                      <h3>{infoTemplateContent.primary.title}</h3>
                      <p>{infoTemplateContent.primary.description}</p>
                    </div>
                  </article>

                  <article className={styles.infoResourceCard}>
                    <div className={styles.infoResourceIcon}>
                      <span className="material-symbols-outlined">favorite</span>
                    </div>
                    <div>
                      <h3>{infoTemplateContent.geriatric.title}</h3>
                      <p>{infoTemplateContent.geriatric.description}</p>
                    </div>
                  </article>
                </div>
              </section>

              <section className={styles.infoContactSection}>
                <div className={styles.infoContactInfo}>
                  <div className={styles.infoContactIntro}>
                    <h2>
                      Contact Our
                      <br />
                      {location.title} Team
                    </h2>
                    <p>We&apos;re here to answer your questions and help you schedule care.</p>
                  </div>

                  <div className={styles.infoContactDetails}>
                    {publicPhone ? (
                      <div className={styles.infoContactItem}>
                        <span className="material-symbols-outlined">phone</span>
                        <div>
                          <p>{publicPhone}</p>
                        </div>
                      </div>
                    ) : null}

                    {addressLines.length > 0 ? (
                      <div className={styles.infoContactItem}>
                        <span className="material-symbols-outlined">location_on</span>
                        <div>
                          {addressLines.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {officeHourRows.length > 0 ? (
                      <div className={styles.infoContactItem}>
                        <span className="material-symbols-outlined">schedule</span>
                        <div>
                          {officeHourRows.map((hours) => (
                            <p key={hours}>{hours}</p>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>

                <form className={styles.infoFormCard} onSubmit={handleInfoFormSubmit}>
                  <label className={styles.infoFormRow}>
                    <span>First Name</span>
                    <input
                      type="text"
                      value={infoFormValues.firstName}
                      onChange={(event) =>
                        setInfoFormValues((current) => ({ ...current, firstName: event.target.value }))
                      }
                      placeholder="Enter your first name"
                      required
                    />
                  </label>

                  <label className={styles.infoFormRow}>
                    <span>Last Name</span>
                    <input
                      type="text"
                      value={infoFormValues.lastName}
                      onChange={(event) =>
                        setInfoFormValues((current) => ({ ...current, lastName: event.target.value }))
                      }
                      placeholder="Enter your last name"
                      required
                    />
                  </label>

                  <label className={styles.infoFormRow}>
                    <span>Email</span>
                    <input
                      type="email"
                      value={infoFormValues.email}
                      onChange={(event) =>
                        setInfoFormValues((current) => ({ ...current, email: event.target.value }))
                      }
                      placeholder="Enter your email"
                      required
                    />
                  </label>

                  <label className={styles.infoFormRow}>
                    <span>Phone</span>
                    <input
                      type="tel"
                      value={infoFormValues.phone}
                      onChange={(event) =>
                        setInfoFormValues((current) => ({ ...current, phone: event.target.value }))
                      }
                      placeholder="Enter your phone number"
                      required
                    />
                  </label>

                  <label className={`${styles.infoFormRow} ${styles.infoFormRowMessage}`}>
                    <span>Message</span>
                    <textarea
                      value={infoFormValues.message}
                      onChange={(event) =>
                        setInfoFormValues((current) => ({ ...current, message: event.target.value }))
                      }
                      rows={4}
                      placeholder="How can we help?"
                      required
                    />
                  </label>

                  <button
                    className={styles.infoFormSubmit}
                    type="submit"
                    disabled={infoFormStatus === "sending"}
                  >
                    <span>{infoFormStatus === "sending" ? "Sending..." : "Send Message"}</span>
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </button>

                  {infoFormMessage ? (
                    <p
                      className={`${styles.infoFormStatus} ${
                        infoFormStatus === "error" ? styles.infoFormStatusError : styles.infoFormStatusSuccess
                      }`}
                    >
                      {infoFormMessage}
                    </p>
                  ) : null}
                </form>
              </section>

              {infoSections.length === 0 ? (
                <div className={styles.emptyState}>No location info sections have been added yet.</div>
              ) : null}
            </section>
          ) : null}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
