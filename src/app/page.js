import Image from "next/image";
import Link from "next/link";
import { Inter, Manrope } from "next/font/google";
import SiteHeader from "./components/site-header";
import styles from "./page.module.css";
import { PATIENT_PORTAL_URL, SITE_NAME } from "./lib/config/site";
import { isDatabaseConfigured, prisma } from "./lib/prisma";

const displayFont = Manrope({
  subsets: ["latin"],
  variable: "--font-home-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-home-body",
});

const heroImage = "/uploads/philosophy-consultation.jpg";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = {
  description:
    "A modern First Medical Associates home page with provider access, location navigation, and patient-first primary care messaging.",
};

const FALLBACK_LOCATION = {
  slug: "/locations",
  title: "Find care close to home",
  accent: "Schedule visits, explore locations, and meet your care team in one place.",
  intro:
    "Our care model combines neighborhood access with a modern, coordinated clinical experience.",
  address: "100 Medical Plaza, Suite 200, City, ST 12345",
  displayAddress: "100 Medical Plaza\nSuite 200\nCity, ST 12345",
  phone: "(555) 123-4567",
  directPhone: "(555) 123-4567",
  callTextPhone: "(555) 123-4567",
  hideOfficePhone: false,
  bookingUrl: "/locations",
};

const FALLBACK_SERVICES = [
  {
    category: "Primary Care",
    title: "Primary Care",
    description:
      "Routine check-ups, preventive care, and comprehensive health management for adults and children.",
  },
  {
    category: "Specialized Care",
    title: "Specialized Care",
    description:
      "Access to top-tier specialists across cardiology, orthopedics, dermatology, and more.",
  },
  {
    category: "Chronic Conditions",
    title: "Chronic Conditions",
    description:
      "Ongoing support and advanced management strategies for diabetes, hypertension, and asthma.",
  },
];

const PHILOSOPHY_POINTS = [
  {
    icon: "calendar",
    title: "Same-Day Appointments",
    description: "When you need care quickly, we ensure you are seen without delay.",
  },
  {
    icon: "devices",
    title: "Sophisticated EMR",
    description: "Seamless digital health records accessible via our intuitive patient portal.",
  },
  {
    icon: "leaf",
    title: "Patient-Centered Environment",
    description:
      "Clinics designed to reduce anxiety, featuring natural light and comfortable waiting areas.",
  },
];

const STORIES = [
  {
    quote:
      "The level of care I received was exceptional. From the moment I walked in, the staff made me feel comfortable and heard.",
    name: "Sarah Jenkins",
    role: "Primary Care Patient",
  },
  {
    quote:
      "Getting a same-day appointment was a lifesaver. The process felt organized, efficient, and surprisingly low-stress.",
    name: "Michael Rodriguez",
    role: "Urgent Visit Patient",
  },
  {
    quote:
      "This is the first practice where I feel truly supported in managing a chronic condition. The care team follows through.",
    name: "Emily Chen",
    role: "Chronic Care Patient",
  },
  {
    quote:
      "The telehealth option and patient portal made everything easier. I always knew where to go and what to expect next.",
    name: "David Thompson",
    role: "Telehealth Patient",
  },
  {
    quote:
      "Beautiful clinic, friendly staff, and clear communication. Even lab follow-up and messaging felt simple and quick.",
    name: "Amanda Williams",
    role: "Preventive Care Patient",
  },
  {
    quote:
      "The coordination between my primary doctor and specialists has been the best part. Nothing feels lost in the shuffle.",
    name: "Robert Brooks",
    role: "Specialty Referral Patient",
  },
];

const FAQS = [
  {
    question: "How does preventive care work?",
    answer:
      "Preventive care focuses on helping you stay healthy and catch concerns early. That usually includes wellness visits, screenings, immunizations, and conversations about risk factors based on your history.",
  },
  {
    question: "What happens if I need specialty care?",
    answer:
      "Your primary care team can help route you to the right specialist and keep your records, medications, and follow-up plans connected along the way.",
  },
  {
    question: "Do you offer telehealth appointments?",
    answer:
      "Yes. Many routine follow-ups and select consultations can be handled through secure telehealth visits, depending on the clinical need.",
  },
  {
    question: "What types of primary care services are available?",
    answer:
      "Services often include wellness visits, physicals, chronic disease management, minor illness care, screenings, immunizations, and longer-term health planning.",
  },
  {
    question: "What insurance plans do you accept?",
    answer:
      "Coverage can vary by office and provider. The fastest path is to contact the location you plan to visit so the team can confirm the most current insurance details.",
  },
  {
    question: "How do I access my records or messages?",
    answer:
      "If your patient portal is available, that is typically the easiest place to review records, manage appointments, and message your care team securely.",
  },
];

const SERVICE_ICONS = ["cross", "pulse", "shield"];

function isExternalUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

function buildPublicPhone(location) {
  if (!location) return "";

  return location.hideOfficePhone
    ? location.callTextPhone || location.directPhone || ""
    : location.phone || location.callTextPhone || location.directPhone || "";
}

function splitAddressLines(location) {
  const raw = String(location?.displayAddress || location?.address || "").trim();

  if (!raw) return [];
  if (raw.includes("\n")) {
    return raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  const parts = raw
    .split(/,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) return parts;

  return [parts.slice(0, -2).join(", "), parts.slice(-2).join(", ")];
}

async function getHomeData() {
  if (!isDatabaseConfigured) {
    return {
      featuredLocation: FALLBACK_LOCATION,
      providerCount: 48,
      locationCount: 14,
      articleCount: 12,
      services: FALLBACK_SERVICES,
    };
  }

  try {
    const [featuredLocation, providerCount, locationCount, articleCount, services] =
      await Promise.all([
        prisma.location.findFirst({
          orderBy: { title: "asc" },
          select: {
            slug: true,
            title: true,
            accent: true,
            intro: true,
            address: true,
            displayAddress: true,
            phone: true,
            directPhone: true,
            callTextPhone: true,
            hideOfficePhone: true,
            bookingUrl: true,
          },
        }),
        prisma.provider.count({
          where: { isActive: true },
        }),
        prisma.location.count(),
        prisma.blogPost.count({
          where: { status: "PUBLISHED" },
        }),
        prisma.service.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
          take: 3,
          select: {
            category: true,
            title: true,
            description: true,
          },
        }),
      ]);

    return {
      featuredLocation: featuredLocation || FALLBACK_LOCATION,
      providerCount,
      locationCount,
      articleCount,
      services: services.length > 0 ? services : FALLBACK_SERVICES,
    };
  } catch (error) {
    console.error("Failed to load homepage data, rendering fallback content instead.", error);

    return {
      featuredLocation: FALLBACK_LOCATION,
      providerCount: 48,
      locationCount: 14,
      articleCount: 12,
      services: FALLBACK_SERVICES,
    };
  }
}

function SmartLink({ href, className, children, ...props }) {
  const target = String(href || "").trim();

  if (!target) {
    return <span className={className}>{children}</span>;
  }

  if (target.startsWith("#")) {
    return (
      <a className={className} href={target} {...props}>
        {children}
      </a>
    );
  }

  if (isExternalUrl(target)) {
    return (
      <a className={className} href={target} rel="noreferrer" target="_blank" {...props}>
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={target} {...props}>
      {children}
    </Link>
  );
}

function Icon({ name, className }) {
  switch (name) {
    case "arrow":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m13 5 7 7-7 7" />
        </svg>
      );
    case "cross":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4v16" />
          <path d="M4 12h16" />
          <path d="M7.5 7.5h9v9h-9z" />
        </svg>
      );
    case "pulse":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 12h4l2.5-5 4 10 2.5-5H21" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3 5 6v6c0 4.5 2.8 7.8 7 9 4.2-1.2 7-4.5 7-9V6l-7-3Z" />
          <path d="M9.5 12.2 11.3 14l3.6-3.8" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 3v4" />
          <path d="M17 3v4" />
          <path d="M4 9h16" />
          <rect x="4" y="5" width="16" height="16" rx="3" />
        </svg>
      );
    case "devices":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="13" height="10" rx="2" />
          <path d="M8 19h3" />
          <rect x="17" y="8" width="4" height="9" rx="1" />
        </svg>
      );
    case "leaf":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 13c0-5 5-8 12-8 0 7-3 12-8 12-2.5 0-4-1.6-4-4Z" />
          <path d="M8 16c2.2-2.2 5.1-4.1 8.7-5.7" />
        </svg>
      );
    case "play":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.7 3.8h3.1l1.3 4.2-2.1 1.7a15.4 15.4 0 0 0 5.3 5.3l1.7-2.1 4.2 1.3v3.1c0 .8-.6 1.4-1.4 1.4A16.8 16.8 0 0 1 5.3 5.2c0-.8.6-1.4 1.4-1.4Z" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      );
    case "location":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      );
    case "chevron":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m12 3.4 2.8 5.6 6.1.9-4.4 4.3 1 6.1L12 17.4l-5.5 2.9 1-6.1L3 9.9 9.1 9l2.9-5.6Z"
            fill="currentColor"
            stroke="none"
          />
        </svg>
      );
    default:
      return null;
  }
}

function StarRow() {
  return (
    <div className={styles.starRow} aria-label="Five star patient review">
      {Array.from({ length: 5 }, (_, index) => (
        <Icon key={index} name="star" className={styles.starIcon} />
      ))}
    </div>
  );
}

export default async function Home() {
  const { featuredLocation, providerCount, locationCount, services } = await getHomeData();

  const bookingHref = featuredLocation.bookingUrl || featuredLocation.slug || "/locations";
  const featuredPhone = buildPublicPhone(featuredLocation) || FALLBACK_LOCATION.phone;
  const addressLines = splitAddressLines(featuredLocation);
  const portalIsConfigured = PATIENT_PORTAL_URL !== "#";
  const contactEmail = "care@firstmedical.com";
  const statCards = [
    { value: `${providerCount}+`, label: "Providers" },
    { value: locationCount, label: "Locations" },
    { value: "4.9", label: "Patient Rating" },
  ];
  const serviceCards = services.slice(0, 3).map((service, index) => ({
    ...service,
    icon: SERVICE_ICONS[index % SERVICE_ICONS.length],
  }));
  const animatedServiceWords =
    serviceCards.length > 0
      ? serviceCards.map((service) => service.title)
      : ["Primary Care", "Diabetes Care", "Asthma Care"];
  const serviceWordStepSeconds = 2.8;
  const serviceWordTotalSeconds = Math.max(
    animatedServiceWords.length * serviceWordStepSeconds,
    serviceWordStepSeconds,
  );
  const longestServiceWord = animatedServiceWords.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    animatedServiceWords[0],
  );
  const serviceWordWidthCh = Math.max(12, longestServiceWord.length + 2);
  const formNote = portalIsConfigured
    ? `Prefer a faster answer? Call ${featuredPhone} or use the patient portal to reach the team directly.`
    : `Prefer a faster answer? Call ${featuredPhone} and our team will help you choose the right next step.`;
  const year = new Date().getFullYear();

  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} ${styles.page}`}>
      <SiteHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroShell}>
            <div className={styles.heroBackground} aria-hidden="true">
              <Image
                src={heroImage}
                alt=""
                className={styles.heroBackgroundImage}
                fill
                priority
                sizes="100vw"
              />
              <div className={styles.heroBackgroundWash} />
            </div>

            <div className={styles.container}>
              <div className={styles.heroCopy}>
                <div className={styles.heroHeading}>
                  <h1 className={styles.heroTitle}>
                    <span className={styles.heroTitleLine}>
                      Receive the{" "}
                      <span className={styles.heroTitleAccentInline}>Care</span>
                    </span>
                    <span className={`${styles.heroTitleLine} ${styles.heroTitleAccentLine}`}>
                      and Treatment
                    </span>
                    <span className={styles.heroTitleLine}>You Deserve</span>
                  </h1>
                </div>

                <p className={styles.heroLead}>
                  First Medical Associates professionals focus on providing superior medical care
                  in a respectful, patient-centered environment.
                </p>

                <div className={styles.heroScheduler}>
                  <p className={styles.heroSchedulerLabel}>Schedule Your Next Appointment</p>
                  <div className={styles.schedulerBar}>
                    <SmartLink href="/locations" className={styles.schedulerItem}>
                      <span className={styles.schedulerTitle}>Where?</span>
                      <span className={styles.schedulerText}>Search City or State</span>
                    </SmartLink>
                    <SmartLink href="/providers" className={styles.schedulerItem}>
                      <span className={styles.schedulerTitle}>Find a Doctor</span>
                      <span className={styles.schedulerText}>Search for a provider</span>
                    </SmartLink>
                    <SmartLink href="#services" className={styles.schedulerItem}>
                      <span className={styles.schedulerTitle}>Appointment Types</span>
                      <span className={styles.schedulerText}>Search for a specialty</span>
                    </SmartLink>
                    <SmartLink
                      href={bookingHref}
                      className={styles.schedulerArrow}
                      aria-label="Continue to appointment scheduling"
                    >
                      <Icon name="arrow" className={styles.schedulerArrowIcon} />
                    </SmartLink>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.serviceSection}`} id="services">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Clinical Offerings</p>
              <h2
                className={`${styles.sectionTitle} ${styles.serviceAnimatedTitle} dnxt_next_text_animation dnxt-headline clip`}
              >
                <span
                  className={`${styles.dnxtAnimationBText} dnxt-animation-b-text dnxt-text-heading`}
                >
                  We Provide the Best
                </span>
                <span
                  className={`${styles.dnxtWordsWrapper} dnxt-words-wrapper`}
                  style={{
                    "--dnxt-step-duration": `${serviceWordStepSeconds}s`,
                    "--dnxt-total-duration": `${serviceWordTotalSeconds}s`,
                    "--dnxt-word-width": `${serviceWordWidthCh}ch`,
                  }}
                >
                  {animatedServiceWords.map((word, index) => (
                    <span
                      key={`${word}-${index}`}
                      className={`${styles.dnxtTextAnimation} dnxt-text-animation ${index === 0 ? "is-visible" : ""}`}
                      style={{
                        "--dnxt-index": index,
                        "--dnxt-char-count": Math.max(String(word).length, 6),
                      }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
              </h2>
            </div>

            <SmartLink href="/locations" className={styles.serviceSectionLink}>
              View All Services
              <Icon name="arrow" className={styles.inlineIcon} />
            </SmartLink>
          </div>

          <div className={styles.serviceGrid}>
            {serviceCards.map((service) => (
              <article key={service.title} className={styles.serviceCard}>
                <span className={styles.serviceIcon}>
                  <Icon name={service.icon} className={styles.serviceIconSvg} />
                </span>
                <div className={styles.serviceCopy}>
                  <h3 className={styles.serviceTitle}>{service.title}</h3>
                  <p className={styles.serviceDescription}>{service.description}</p>
                </div>
                <SmartLink href="/locations" className={styles.textLink}>
                  Learn More
                  <Icon name="arrow" className={styles.inlineIcon} />
                </SmartLink>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft} ${styles.philosophySection}`} id="about">
          <div className={styles.philosophyLayout}>
            <div className={styles.philosophyVisual}>
              <div className={styles.philosophyImageWrap}>
                <Image
                  src="/uploads/philosophy-consultation.jpg"
                  alt="Doctor consulting with a patient in a modern clinic office"
                  className={styles.philosophyImage}
                  fill
                  sizes="(max-width: 1100px) 100vw, 42vw"
                />
              </div>

              <div className={styles.philosophyStats}>
                {statCards.map((stat, index) => (
                  <div key={stat.label} className={styles.philosophyStat}>
                    <strong className={styles.philosophyStatValue}>{stat.value}</strong>
                    <span className={styles.philosophyStatLabel}>{stat.label}</span>
                    {index < statCards.length - 1 ? (
                      <span className={styles.philosophyDivider} aria-hidden="true" />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.philosophyContent}>
              <div>
                <p className={styles.sectionLabel}>Our Philosophy</p>
                <h2 className={styles.sectionTitle}>Elevating the standard of clinical excellence.</h2>
                <p className={styles.sectionText}>
                  We believe that premium healthcare should be accessible, transparent, and built
                  entirely around the patient. Our modern facilities and sophisticated medical
                  teams are dedicated to providing clarity and comfort in every interaction.
                </p>
              </div>

              <div className={styles.featureList}>
                {PHILOSOPHY_POINTS.map((point) => (
                  <article key={point.title} className={styles.featureItem}>
                    <span className={styles.featureIcon}>
                      <Icon name={point.icon} className={styles.featureIconSvg} />
                    </span>
                    <div>
                      <h3 className={styles.featureTitle}>{point.title}</h3>
                      <p className={styles.featureText}>{point.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.experienceSection}`}>
          <div className={styles.experienceLayout}>
            <div className={styles.mediaCard}>
              <Image
                src={heroImage}
                alt="Bright, welcoming First Medical Associates clinical experience"
                className={styles.mediaImage}
                fill
                sizes="(max-width: 1100px) 100vw, 44vw"
              />
              <div className={styles.mediaShade} aria-hidden="true" />
              <div className={styles.mediaOverlay}>
                <span className={styles.mediaBadge}>Welcome</span>
                <div className={styles.playButton}>
                  <Icon name="play" className={styles.playIcon} />
                </div>
                <p className={styles.mediaCaption}>
                  A calmer experience starts before the visit, with clearer next steps, easier
                  scheduling, and care teams that make follow-through feel simple.
                </p>
              </div>
            </div>

            <div className={styles.experienceContent}>
              <p className={styles.sectionLabel}>Experience</p>
              <h2 className={styles.sectionTitle}>Experience excellence in care.</h2>
              <p className={styles.sectionText}>
                Explore nearby offices, connect with trusted providers, and move from question to
                appointment with less friction and more confidence.
              </p>
              <SmartLink href="/providers" className={styles.primaryButton}>
                Meet Our Providers
                <Icon name="arrow" className={styles.buttonIcon} />
              </SmartLink>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft} ${styles.storySection}`}>
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>Patient Stories</p>
              <h2 className={styles.sectionTitle}>What our patients say</h2>
            </div>
          </div>

          <div className={styles.storyGrid}>
            {STORIES.map((story) => (
              <article key={`${story.name}-${story.role}`} className={styles.storyCard}>
                <StarRow />
                <p className={styles.storyQuote}>&ldquo;{story.quote}&rdquo;</p>
                <div>
                  <h3 className={styles.storyName}>{story.name}</h3>
                  <p className={styles.storyRole}>{story.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="faq">
          <div className={styles.sectionHeader}>
            <div>
              <p className={styles.sectionLabel}>FAQ</p>
              <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
            </div>
          </div>

          <div className={styles.faqGrid}>
            {FAQS.map((item, index) => (
              <details key={item.question} className={styles.faqItem} open={index === 0}>
                <summary className={styles.faqSummary}>
                  <span>{item.question}</span>
                  <span className={styles.faqToggle}>
                    <Icon name="chevron" className={styles.faqToggleIcon} />
                  </span>
                </summary>
                <p className={styles.faqAnswer}>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft} ${styles.contactSection}`} id="contact">
          <div className={styles.contactLayout}>
            <div className={styles.contactContent}>
              <div>
                <p className={styles.sectionLabel}>Get in Touch</p>
                <h2 className={styles.sectionTitle}>Begin your health journey.</h2>
                <p className={styles.sectionText}>
                  Whether you are ready to schedule, comparing locations, or simply have a
                  question, our team is here to help you find the clearest next step.
                </p>
              </div>

              <div className={styles.contactStack}>
                <article className={styles.contactRow}>
                  <span className={styles.contactIcon}>
                    <Icon name="location" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.metaLabel}>Main office</p>
                    <p className={styles.metaValue}>
                      {addressLines.length > 0 ? (
                        addressLines.map((line) => (
                          <span key={line} className={styles.addressLine}>
                            {line}
                          </span>
                        ))
                      ) : (
                        <span className={styles.addressLine}>{FALLBACK_LOCATION.address}</span>
                      )}
                    </p>
                  </div>
                </article>

                <article className={styles.contactRow}>
                  <span className={styles.contactIcon}>
                    <Icon name="phone" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.metaLabel}>Phone</p>
                    <p className={styles.metaValue}>{featuredPhone}</p>
                    <p className={styles.contactHint}>Mon-Fri, 8am-5pm</p>
                  </div>
                </article>

                <article className={styles.contactRow}>
                  <span className={styles.contactIcon}>
                    <Icon name="mail" className={styles.contactIconSvg} />
                  </span>
                  <div>
                    <p className={styles.metaLabel}>Email</p>
                    <p className={styles.metaValue}>{contactEmail}</p>
                    <p className={styles.contactHint}>We aim to reply within 24 hours.</p>
                  </div>
                </article>
              </div>
            </div>

            <div className={styles.contactCard}>
              <form className={styles.form} action="#">
                <div className={styles.formGrid}>
                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Full Name</span>
                    <input
                      className={styles.fieldInput}
                      name="name"
                      placeholder="John Doe"
                      type="text"
                    />
                  </label>

                  <label className={styles.fieldGroup}>
                    <span className={styles.fieldLabel}>Email Address</span>
                    <input
                      className={styles.fieldInput}
                      name="email"
                      placeholder="john@example.com"
                      type="email"
                    />
                  </label>
                </div>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Phone Number</span>
                  <input
                    className={styles.fieldInput}
                    name="phone"
                    placeholder="(555) 123-4567"
                    type="tel"
                  />
                </label>

                <label className={styles.fieldGroup}>
                  <span className={styles.fieldLabel}>Message</span>
                  <textarea
                    className={styles.fieldTextarea}
                    name="message"
                    placeholder="How can we help you?"
                    rows="5"
                  />
                </label>

                <div className={styles.formActions}>
                  <button className={styles.submitButton} type="button">
                    Send Message
                  </button>
                  <p className={styles.formNote}>{formNote}</p>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerGrid}>
          <div className={styles.footerBlock}>
            <h2 className={styles.footerBrand}>{SITE_NAME}</h2>
            <p className={styles.footerDescription}>
              Excellence in clinical care, with neighborhood access, thoughtful communication, and
              care teams who know how to keep things moving.
            </p>
          </div>

          <div className={styles.footerBlock}>
            <h3 className={styles.footerHeading}>Explore</h3>
            <div className={styles.footerLinks}>
              <SmartLink href="/locations" className={styles.footerLink}>
                Locations
              </SmartLink>
              <SmartLink href="/providers" className={styles.footerLink}>
                Providers
              </SmartLink>
              <SmartLink href="/blog" className={styles.footerLink}>
                Blog
              </SmartLink>
              <SmartLink href="#faq" className={styles.footerLink}>
                FAQ
              </SmartLink>
            </div>
          </div>

          <div className={styles.footerBlock}>
            <h3 className={styles.footerHeading}>Contact</h3>
            <div className={styles.footerDetails}>
              <p>{featuredPhone}</p>
              <p>{contactEmail}</p>
              <p>{addressLines.length > 0 ? addressLines.join(", ") : FALLBACK_LOCATION.address}</p>
            </div>
          </div>

          <div className={styles.footerBlock}>
            <h3 className={styles.footerHeading}>Visit</h3>
            <SmartLink href={bookingHref} className={styles.footerCta}>
              Book Appointment
            </SmartLink>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p className={styles.footerCopyright}>
            Copyright {year} {SITE_NAME}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

