import Link from "next/link";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { searchSite } from "../lib/site-search";
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

function groupResultsByKind(results = []) {
  return results.reduce((groups, result) => {
    const existingGroup = groups.find((group) => group.kind === result.kind);

    if (existingGroup) {
      existingGroup.items.push(result);
      return groups;
    }

    groups.push({
      kind: result.kind,
      label: result.categoryLabel,
      items: [result],
    });
    return groups;
  }, []);
}

export default async function SearchPage({ searchParams }) {
  const { q = "" } = await searchParams;
  const { query, results } = await searchSite(q, {
    perTypeLimit: 8,
    totalLimit: 18,
  });
  const groups = groupResultsByKind(results);
  const hasQuery = query.length >= 2;

  return (
    <div className={styles.page}>
      <SiteHeader />
      <main className={styles.shell}>
        <section className={styles.hero}>
          <p className={styles.eyebrow}>Search Directory</p>
          <h1>Search the entire website.</h1>
          <p className={styles.lead}>
            Find providers, clinic locations, and published articles from one place.
          </p>

          {hasQuery ? (
            <div className={styles.summaryRow}>
              <span className={styles.summaryPill}>Query: {query}</span>
              <span className={styles.summaryText}>
                {results.length} result{results.length === 1 ? "" : "s"} found
              </span>
            </div>
          ) : (
            <div className={styles.summaryRow}>
              <span className={styles.summaryPill}>Try a provider, city, ZIP, or article topic</span>
            </div>
          )}
        </section>

        {!hasQuery ? (
          <section className={styles.emptyCard}>
            <strong>Start with at least 2 characters.</strong>
            <p>Examples: Melinda, Annapolis, Silver Spring, or preventive care.</p>
          </section>
        ) : results.length === 0 ? (
          <section className={styles.emptyCard}>
            <strong>No pages matched "{query}".</strong>
            <p>Try a broader search term, a city name, or a provider last name.</p>
          </section>
        ) : (
          <div className={styles.groupList}>
            {groups.map((group) => (
              <section key={group.kind} className={styles.groupSection}>
                <div className={styles.groupHeader}>
                  <h2>{group.label}</h2>
                  <span>{group.items.length} match{group.items.length === 1 ? "" : "es"}</span>
                </div>

                <div className={styles.resultsGrid}>
                  {group.items.map((result) => (
                    <Link key={`${result.kind}-${result.href}`} className={styles.resultCard} href={result.href}>
                      <span className={styles.resultBadge}>{result.categoryLabel}</span>
                      <h3>{result.title}</h3>
                      <p>{result.description}</p>
                      <span className={styles.resultAction}>Open page</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
