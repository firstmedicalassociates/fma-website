"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import { Briefcase, Handshake, Info, Target } from "lucide-react";
import HeroEyebrow from "../components/hero-eyebrow";
import { PillToggleNav } from "../components/pill-toggles";
import styles from "../components/brandon-route-shell.module.css";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const inter = Inter({ subsets: ["latin"] });

export default function AboutLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    "/about": {
      tag: "About First Medical Associates",
      title: "Healthcare With a Purpose",
      subtitle:
        "Innovative Healthcare focused on Your Health Goals.",
    },
    "/about/careers": {
      tag: "Careers",
      title: "A Career That Makes a Difference.",
      subtitle:
        "Join a team of compassionate professionals building healthier communities through patient-first care.",
    },
    "/about/partners": {
      tag: "Partner With Us",
      title: "Stronger Together.\nBetter Care for All.",
      subtitle:
        "We collaborate with organizations that share our commitment to improving health outcomes and strengthening the communities we serve.",
    },
    "/about/mission": {
      tag: "Mission, Vision, & Values",
      title: "Mission, Vision, & Values",
      subtitle:
        "High-quality, accessible care that patients trust and our team is proud to deliver.",
    },
  };

  const currentHero = heroContent[pathname] || heroContent["/about"];
  const tabs = [
    { name: "About", href: "/about", icon: Info },
    { name: "Mission & Values", href: "/about/mission", icon: Target },
    { name: "Careers", href: "/about/careers", icon: Briefcase },
    { name: "Partner With Us", href: "/about/partners", icon: Handshake },
  ];

  return (
    <>
      <SiteHeader />
      <main className={`${styles.routeRoot} ${inter.className}`}>
        <div className={styles.container}>
          <section className={styles.aboutHero}>
            <div className={styles.heroGrid}>
              <div>
                <HeroEyebrow>{currentHero.tag}</HeroEyebrow>
                <h1 className={styles.aboutHeroTitle}>{currentHero.title}</h1>
              </div>
              <div className={styles.heroSubtitleBox}>
                <p className={styles.aboutHeroSubtitle}>{currentHero.subtitle}</p>
              </div>
            </div>
          </section>

          <PillToggleNav
            items={tabs}
            activeHref={pathname}
            ariaLabel="About navigation"
            fullBleedMobile
          />

          <div>{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
