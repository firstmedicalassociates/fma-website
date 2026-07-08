import Image from "next/image";
import Link from "next/link";
import { Inter, Manrope } from "next/font/google";
import SiteHeader from "./components/site-header";
import SiteFooter from "./components/site-footer";
import HeroEyebrow from "./components/hero-eyebrow";
import WelcomeVideoCard from "./components/welcome-video-card";
import HomeHeroAiSearch from "./components/home-hero-ai-search";
import ServiceTypedWord from "./components/service-typed-word";
import WhyChooseAccordion from "./components/why-choose-accordion";
import { VISIBLE_LOCATION_WHERE } from "./lib/locations";
import { buildStaticMetadata } from "./lib/seo";
import styles from "./page.module.css";
import { isDatabaseConfigured, prisma } from "./lib/prisma";

const displayFont = Manrope({
  subsets: ["latin"],
  variable: "--font-home-display",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-home-body",
});

const heroBackgroundImage = "/uploads/Header-bcgn-1-scaled.jpg";
const heroBackgroundImageMobile = "/uploads/Header-bcgn-2-mobile.jpg";
const welcomeVideoPoster = "/uploads/FMA%20Video%20Thumnail.png";
const welcomeVideoSource =
  process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL || "/uploads/FMA_Promo_full.mp4";

export const runtime = "nodejs";
export const revalidate = 60;

export const metadata = buildStaticMetadata({
  title: "Primary Care & Specialized Care Services in Maryland | First Medical Associates",
  description:
    "Primary care, specialized care, chronic care, and telehealth services across Maryland. Find doctors, locations, and same-day care at First Medical Associates.",
  pathname: "/",
});

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

const STORIES = [
  {
    quote:
      "The level of care I received was exceptional. From the moment I walked in, the staff made me feel comfortable and heard.",
    name: "S. J.",
    role: "Primary Care Patient",
  },
  {
    quote:
      "Getting a same-day appointment was a lifesaver. The process felt organized, efficient, and surprisingly low-stress.",
    name: "M. R.",
    role: "Same-Day Visit Patient",
  },
  {
    quote:
      "This is the first practice where I feel truly supported in managing a chronic condition. The care team follows through.",
    name: "E. C.",
    role: "Chronic Care Patient",
  },
  {
    quote:
      "The telehealth option and patient portal made everything easier. I always knew where to go and what to expect next.",
    name: "D. T.",
    role: "Telehealth Patient",
  },
  {
    quote:
      "Beautiful clinic, friendly staff, and clear communication. Even lab follow-up and messaging felt simple and quick.",
    name: "A. W.",
    role: "Preventive Care Patient",
  },
  {
    quote:
      "The coordination between my primary doctor and specialists has been the best part. Nothing feels lost in the shuffle.",
    name: "R. B.",
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

const HOME_SERVICE_SHOWCASE = [
  {
    title: "Primary Care",
    image: "/assets/drs-first-primary-care.jpg",
    alt: "A physician smiling with an older adult patient during a primary care visit.",
    href: "/service/primary-care",
  },
  {
    title: "Chronic Conditions",
    image: "/assets/drs-first-chronic-conditions.jpg",
    alt: "An older couple reviewing chronic care information together.",
    href: "/services?category=Chronic%20Conditions",
  },
  {
    title: "Specialized Care",
    image: "/assets/drs-first-urgent-needs.jpg",
    alt: "A child pretending to check a man's heartbeat with a stethoscope.",
    href: "/services?category=Specialized%20Care",
  },
];

const WHY_CHOOSE_ACCORDION = [
  {
    title: "Comprehensive and collaborative approach to healthcare across multiple Maryland locations",
    description:
      "Our care teams collaborate across locations to deliver coordinated treatment plans, smoother referrals, and more consistent follow-up.",
    expanded: false,
  },
  {
    title: "Modern practices delivering safe, effective healthcare you deserve",
    description:
      "We combine evidence-based protocols, modern technology, and experienced clinicians to provide care that is both safe and effective.",
    expanded: false,
  },
  {
    title: "Personalized care that increases your health outcomes",
    description:
      "Our teams build long-term relationships with patients and coordinate care plans around your history, goals, and everyday needs.",
    expanded: true,
  },
];

const HEALTHCARE_HIGHLIGHTS = [
  "Same-Day Appointments",
  "On-Site Lab Testing",
  "Most Insurances Accepted",
  "Multiple Locations to Serve You",
  "Top-Rated Healthcare",
];

const SERVICE_TYPED_WORDS = [
  "Primary Care",
  "Chronic Conditions",
  "Specialized Care",
  "Asthma Care",
  "Diabetes Care",
];
const SERVICE_TYPED_LONGEST_WORD = SERVICE_TYPED_WORDS.reduce(
  (longest, word) => (word.length > longest.length ? word : longest),
  SERVICE_TYPED_WORDS[0],
);
const SERVICE_TYPED_WIDTH_CH = Math.max(12, SERVICE_TYPED_LONGEST_WORD.length + 1);

function isExternalUrl(url = "") {
  return /^https?:\/\//i.test(url);
}

async function getHomeData() {
  if (!isDatabaseConfigured) {
    return {
      featuredLocation: FALLBACK_LOCATION,
      providerCount: 48,
      locationCount: 14,
      articleCount: 12,
      services: FALLBACK_SERVICES,
      heroSearchLocations: [
        {
          slug: FALLBACK_LOCATION.slug,
          addressCity: "City",
          addressState: "ST",
        },
      ],
      heroSearchProviders: [],
    };
  }

  try {
    const [featuredLocation, providerCount, locationCount, articleCount, services, heroSearchLocations, heroSearchProviders] =
      await Promise.all([
        prisma.location.findFirst({
          where: VISIBLE_LOCATION_WHERE,
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
        prisma.location.count({ where: VISIBLE_LOCATION_WHERE }),
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
        prisma.location.findMany({
          where: VISIBLE_LOCATION_WHERE,
          select: {
            slug: true,
            addressCity: true,
            addressState: true,
          },
        }),
        prisma.provider.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            slug: true,
            name: true,
            linkUrl: true,
            locations: true,
          },
        }),
      ]);

    return {
      featuredLocation: featuredLocation || FALLBACK_LOCATION,
      providerCount,
      locationCount,
      articleCount,
      services: services.length > 0 ? services : FALLBACK_SERVICES,
      heroSearchLocations,
      heroSearchProviders,
    };
  } catch (error) {
    console.error("Failed to load homepage data, rendering fallback content instead.", error);

    return {
      featuredLocation: FALLBACK_LOCATION,
      providerCount: 48,
      locationCount: 14,
      articleCount: 12,
      services: FALLBACK_SERVICES,
      heroSearchLocations: [
        {
          slug: FALLBACK_LOCATION.slug,
          addressCity: "City",
          addressState: "ST",
        },
      ],
      heroSearchProviders: [],
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
    case "close":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 6 12 12" />
          <path d="m18 6-12 12" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.2" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "ai-sparkle":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 2.75 13.75 8.25 19.25 10 13.75 11.75 12 17.25 10.25 11.75 4.75 10 10.25 8.25 12 2.75Z" />
          <path d="M19 14.5 19.8 17.2 22.5 18 19.8 18.8 19 21.5 18.2 18.8 15.5 18 18.2 17.2 19 14.5Z" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  const { featuredLocation, providerCount, locationCount, heroSearchLocations, heroSearchProviders } =
    await getHomeData();

  const contactBookingHref = featuredLocation?.bookingUrl || "/locations";

  return (
    <div className={`${displayFont.variable} ${bodyFont.variable} ${styles.page}`}>
      <SiteHeader />

      <main className={styles.main}>
        <section className={styles.hero}>
          <div className={styles.heroShell}>
            <div className={styles.heroBackground} aria-hidden="true">
              <Image
                src={heroBackgroundImage}
                alt=""
                className={styles.heroBackgroundImage}
                fill
                priority
                sizes="100vw"
              />
              <Image
                src={heroBackgroundImageMobile}
                alt=""
                className={styles.heroBackgroundImageMobile}
                fill
                priority
                sizes="100vw"
              />
              <div className={styles.heroBackgroundWash} />
            </div>

            <div className={styles.container}>
              <div className={styles.heroCopy}>
                <div className={styles.heroHeading}>
                  <HeroEyebrow>Patient-Centered Primary Care</HeroEyebrow>

                  <h1 className={styles.heroTitle}>
                    <span className={styles.heroTitleLine}>
                      Primary Care &amp; Specialized Care
                    </span>
                    <span className={`${styles.heroTitleLine} ${styles.heroTitleAccentLine}`}>
                      Across Maryland
                    </span>
                  </h1>
                </div>

                <p className={styles.heroLead}>
                  First Medical Associates delivers patient-centered primary care, same-day visits,
                  and coordinated support across Maryland.
                </p>

                <div className={styles.heroScheduler}>
                  <p className={styles.heroSchedulerLabel}>Schedule Your Next Appointment</p>
                  <HomeHeroAiSearch
                    locations={heroSearchLocations}
                    providers={heroSearchProviders}
                  />
                </div>

                <div className={styles.heroMobileFigure} aria-hidden="true">
                  <Image
                    src={heroBackgroundImageMobile}
                    alt=""
                    className={styles.heroMobileFigureImage}
                    width={1113}
                    height={1113}
                    sizes="(max-width: 780px) 100vw, 0px"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.serviceSection}`} id="services">
          <div className={styles.serviceShowcaseHeader}>
            <h2 className={`${styles.sectionTitle} ${styles.serviceShowcaseTitle}`}>
              <span className={styles.serviceShowcaseTitleTop}>We Provide the Best</span>
              <span className={styles.serviceShowcaseTitleAccent}>
                <ServiceTypedWord
                  words={SERVICE_TYPED_WORDS}
                  widthCh={SERVICE_TYPED_WIDTH_CH}
                  wrapperClassName={styles.serviceTypedWord}
                  textClassName={styles.serviceTypedWordText}
                  caretClassName={styles.serviceTypedWordCaret}
                />
              </span>
            </h2>
          </div>

          <div className={styles.serviceShowcaseGrid}>
            {HOME_SERVICE_SHOWCASE.map((tile) => (
              <SmartLink key={tile.title} href={tile.href} className={styles.serviceShowcaseCard}>
                <div className={styles.serviceShowcaseImageWrap}>
                  <Image
                    src={tile.image}
                    alt={tile.alt}
                    className={styles.serviceShowcaseImage}
                    width={680}
                    height={680}
                    sizes="(max-width: 780px) 100vw, (max-width: 1100px) 50vw, 33vw"
                  />
                </div>
                <h3 className={styles.serviceShowcaseLabel}>{tile.title}</h3>
              </SmartLink>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.whyChooseSection}`}>
          <div className={styles.whyChooseLayout}>
            <div className={styles.whyChooseContent}>
              <div className={styles.whyChooseBadge} aria-label="FMA Why Choose Us">
                <span className={styles.whyChooseBadgeMark}>FMA</span>
                <span className={styles.whyChooseBadgeText}>Why Choose Us</span>
              </div>

              <h2 className={styles.whyChooseTitle}>
                <span className={styles.whyChooseTitleTop}>First Medical Associates</span>
                <span className={styles.whyChooseTitleAccent}>Puts You First</span>
              </h2>

              <p className={styles.whyChooseText}>
                Our patients build trusting relationships with their primary care doctors and
                internists and receive personalized care to increase their health outcomes.
              </p>

              <SmartLink href="/about" className={styles.whyChooseButton}>
                Learn More
              </SmartLink>
            </div>

            <WhyChooseAccordion items={WHY_CHOOSE_ACCORDION} styles={styles} />
          </div>
        </section>

        <section className={`${styles.section} ${styles.experienceSection}`}>
          <div className={styles.experienceLayout}>
            <div className={styles.mediaCard}>
              <WelcomeVideoCard poster={welcomeVideoPoster} source={welcomeVideoSource} />
            </div>

            <div className={styles.experienceContent}>
              <h2 className={styles.healthcareTitle}>
                <span className={styles.healthcareTitleTop}>Healthcare Services</span>
                <span className={styles.healthcareTitleAccent}>Personalized For You</span>
              </h2>

              <p className={styles.healthcareText}>
                Our personalized care is dedicated to increasing your health outcomes and quality
                of life.
              </p>

              <ul className={styles.healthcareList}>
                {HEALTHCARE_HIGHLIGHTS.map((item) => (
                  <li key={item} className={styles.healthcareListItem}>
                    <span className={styles.healthcareListIcon} aria-hidden="true">
                      &#10003;
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            id="welcome-video-lightbox"
            className={styles.videoLightbox}
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-video-lightbox-title"
          >
            <a
              href="#close"
              className={styles.videoLightboxBackdrop}
              aria-label="Close welcome video"
            />
            <div className={styles.videoLightboxPanel}>
              <div className={styles.videoLightboxHeader}>
                <h3 id="welcome-video-lightbox-title" className={styles.videoLightboxTitle}>
                  Welcome Video
                </h3>
                <a
                  href="#close"
                  className={styles.videoLightboxClose}
                  aria-label="Close welcome video"
                >
                  <Icon name="close" className={styles.videoLightboxCloseIcon} />
                </a>
              </div>

              <div className={styles.videoLightboxFrame}>
                <video
                  className={styles.videoPlayer}
                  controls
                  playsInline
                  preload="metadata"
                  poster={welcomeVideoPoster}
                >
                  <source src={welcomeVideoSource} type="video/mp4" />
                  Your browser does not support HTML5 video.
                </video>
              </div>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.commitSection}`}>
          <div className={styles.commitLayout}>
            <div className={styles.commitContent}>
              <h2 className={styles.commitTitle}>
                Committed To Bettering
                <br />
                Your Care Each Visit
              </h2>
              <p className={styles.commitText}>
                First Medical Associates provides a comprehensive and collaborative approach to
                health care across multiple locations in Maryland.
              </p>
              <SmartLink href="/providers" className={styles.commitButton}>
                Find a Doctor
              </SmartLink>
            </div>

            <div className={styles.commitStats} aria-label="Practice statistics">
              <article className={styles.commitStatItem}>
                <p className={styles.commitStatValue}>{providerCount}</p>
                <p className={styles.commitStatLabel}>
                  <span>Active</span> Providers
                </p>
              </article>
              <article className={styles.commitStatItem}>
                <p className={styles.commitStatValue}>{locationCount}</p>
                <p className={styles.commitStatLabel}>
                  <span>Locations</span> To Serve You
                </p>
              </article>
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.sectionSoft} ${styles.storySection}`}>
          <div className={`${styles.sectionHeader} ${styles.storyHeader}`}>
            <h2 className={styles.storyHeadline}>
              <span className={styles.storyHeadlineAccent}>Trusted</span> By Patients Like You
            </h2>
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

          <div className={styles.mobileStoryDots} aria-hidden="true">
            <span className={`${styles.mobileStoryDot} ${styles.mobileStoryDotActive}`} />
            <span className={styles.mobileStoryDot} />
            <span className={styles.mobileStoryDot} />
          </div>
        </section>

        <section className={`${styles.section} ${styles.faqSection}`} id="faq">
          <div className={`${styles.sectionHeader} ${styles.faqHeader}`}>
            <h2 className={styles.faqHeadline}>
              Your <span className={styles.faqHeadlineAccent}>Wellness Team</span> By Your Side
            </h2>
          </div>

          <div className={styles.faqGrid}>
            {FAQS.map((item) => (
              <details key={item.question} className={styles.faqItem}>
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
      </main>

      <SiteFooter />
    </div>
  );
}

