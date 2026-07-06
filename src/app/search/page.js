import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import SearchClient from "./search-client";
import styles from "./search-page.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SearchPage() {
  return (
    <div className={styles.page}>
      <SiteHeader />
      <SearchClient />
      <SiteFooter />
    </div>
  );
}
