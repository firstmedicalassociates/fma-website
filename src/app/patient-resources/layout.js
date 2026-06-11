"use client";

import { Inter } from "next/font/google";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import HeroEyebrow from "../components/hero-eyebrow";
import { PillToggleNav } from "../components/pill-toggles";
import styles from "../components/brandon-route-shell.module.css";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const inter = Inter({ subsets: ["latin"] });

export default function PatientResourceLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    "/patient-resources": {
      title: "Patient Resources",
      subtitle:
        "Streamlined access to insurance verification, clinical forms, and essential tools for managing your healthcare journey with First Medical Associates.",
    },
    "/patient-resources/insurance": {
      title: "Accepted Insurance Plans",
      subtitle:
        "Review accepted insurance plans, Medicare, Medicaid, self-pay details, and related patient forms for First Medical Associates.",
    },
    "/patient-resources/education": {
      title: "Patient Education",
      subtitle:
        "Expert medical insights, clinical guides, and essential tools curated by our specialists to empower your health journey.",
    },
    "/patient-resources/press": {
      title: "Press Releases",
      subtitle:
        "Expert medical insights, clinical updates, and important news from First Medical Associates.",
    },
  };

  const currentHero = heroContent[pathname] || heroContent["/patient-resources"];

  const tabs = [
    { name: "Overview", href: "/patient-resources", icon: LayoutDashboard },
    { name: "Insurance", href: "/patient-resources/insurance", icon: ShieldCheck },
    { name: "Patients", href: "/patient-resources/patients", icon: Users },
    { name: "Education", href: "/patient-resources/education", icon: GraduationCap },
  ];

  return (
    <>
      <SiteHeader />
      <main className={`${styles.routeRoot} ${inter.className}`}>
        <div className={styles.container}>
          <section className={styles.resourceHero}>
            <div>
              <HeroEyebrow>Central Hub</HeroEyebrow>
              <h1 className={styles.heroTitle}>{currentHero.title || "Patient Resources"}</h1>
              <p className={styles.heroSubtitle}>{currentHero.subtitle}</p>
            </div>
          </section>

          <PillToggleNav
            items={tabs}
            activeHref={pathname}
            ariaLabel="Patient resources navigation"
            fullBleedMobile
          />

          <div>{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
