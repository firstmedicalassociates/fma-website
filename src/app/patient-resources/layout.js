"use client";

import { Inter } from "next/font/google";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "../components/brandon-route-shell.module.css";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";

const inter = Inter({ subsets: ["latin"] });

export default function PatientResourceLayout({ children }) {
  const pathname = usePathname();

  const heroContent = {
    "/patient-resources": {
      subtitle:
        "Streamlined access to insurance verification, clinical forms, and essential tools for managing your healthcare journey with First Medical Associates.",
      icon: FileText,
    },
    "/patient-resources/insurance": {
      subtitle:
        "Streamlined access to insurance verification, clinical forms, and essential tools for managing your healthcare journey with First Medical Associates.",
      icon: FileText,
    },
    "/patient-resources/education": {
      subtitle:
        "Expert medical insights, clinical guides, and essential tools curated by our specialists to empower your health journey.",
      icon: BookOpen,
    },
    "/patient-resources/press": {
      subtitle:
        "Expert medical insights, clinical updates, and important news from First Medical Associates.",
      icon: Megaphone,
    },
  };

  const currentHero = heroContent[pathname] || heroContent["/patient-resources"];
  const HeroIcon = currentHero.icon;

  const tabs = [
    { name: "Overview", href: "/patient-resources", icon: LayoutDashboard },
    { name: "Insurance", href: "/patient-resources/insurance", icon: ShieldCheck },
    { name: "Patients", href: "/patient-resources/patients", icon: Users },
    { name: "Education", href: "/patient-resources/education", icon: GraduationCap },
    { name: "Press Releases", href: "/patient-resources/press", icon: Megaphone },
  ];

  return (
    <>
      <SiteHeader />
      <main className={`${styles.routeRoot} ${inter.className}`}>
        <div className={styles.container}>
          <section className={styles.resourceHero}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div className={styles.heroTag}>Central Hub</div>
                <h1 className={styles.heroTitle}>Patient Resource Center</h1>
                <p className={styles.heroSubtitle}>{currentHero.subtitle}</p>
              </div>
              <div style={{ background: "#e8f0fe", padding: "1.5rem", borderRadius: "12px" }}>
                <HeroIcon size={40} color="#001c55" />
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
