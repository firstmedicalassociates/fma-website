import { Inter } from "next/font/google";
import SiteHeader from "../components/site-header";
import SiteFooter from "../components/site-footer";
import styles from "../components/brandon-route-shell.module.css";

const inter = Inter({ subsets: ["latin"] });

export default function CareersLayout({ children }) {
  return (
    <>
      <SiteHeader />
      <main className={`${styles.routeRoot} ${inter.className}`}>
        <div className={styles.container}>{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}
