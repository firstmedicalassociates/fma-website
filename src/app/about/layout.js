"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Handshake, Info, Target, Users } from "lucide-react";
import styles from "../components/brandon-route-shell.module.css";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const inter = Inter({ subsets: ["latin"] });

export default function AboutLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    "/about": {
      tag: "Our Legacy of Care",
      title: "The Clinical Curator of Modern Healthcare.",
      subtitle:
        "Redefining medical excellence through intentional clinical precision and compassionate patient stewardship for over two decades.",
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
      tag: "Mission & Values",
      title: "Our Mission.\nOur Commitment.",
      subtitle:
        "Guided by purpose and driven by core values, we are committed to transforming healthcare through patient-first care.",
    },
    "/about/leadership": {
      tag: "Leadership",
      title: "Guided by Clinical Excellence.",
      subtitle:
        "Meet the team of medical professionals and healthcare leaders dedicated to shaping the future of First Medical Associates.",
    },
  };

  const currentHero = heroContent[pathname] || heroContent["/about"];
  const tabs = [
    { name: "About", href: "/about", icon: Info },
    { name: "Careers", href: "/about/careers", icon: Briefcase },
    { name: "Partner With Us", href: "/about/partners", icon: Handshake },
    { name: "Mission & Values", href: "/about/mission", icon: Target },
    { name: "Leadership", href: "/about/leadership", icon: Users },
  ];

  return (
    <>
      <SiteHeader />
      <main className={`${styles.routeRoot} ${inter.className}`}>
        <div className={styles.container}>
          <section className={styles.aboutHero}>
            <div className={styles.heroGrid}>
              <div>
                <div className={styles.heroTag}>{currentHero.tag}</div>
                <h1 className={styles.aboutHeroTitle}>{currentHero.title}</h1>
              </div>
              <div className={styles.heroSubtitleBox}>
                <p className={styles.aboutHeroSubtitle}>{currentHero.subtitle}</p>
              </div>
            </div>
          </section>

          <nav className={styles.tabsBar}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`${styles.tabItem} ${isActive ? styles.tabItemActive : ""}`}
                >
                  <Icon size={18} />
                  {tab.name}
                </Link>
              );
            })}
          </nav>

          <div>{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
