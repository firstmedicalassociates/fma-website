import { notFound } from "next/navigation";
import { Briefcase, MapPin, ArrowUpRight, CalendarDays } from "lucide-react";
import { getCareers } from "../../../lib/careers";
import { buildStaticMetadata } from "../../../lib/seo";
import { CareersBackLink, CareersUnavailable } from "../states";
import styles from "../careers.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const feed = await getCareers();
  const job = feed.jobs.find((item) => item.id === id);
  if (!job) return { title: "Careers | First Medical Associates", robots: { index: false, follow: true } };
  return buildStaticMetadata({
    title: `${job.title} | First Medical Associates Careers`,
    description: job.summary.slice(0, 160) || `Learn about the ${job.title} position at First Medical Associates and apply online.`,
    pathname: `/patient-resources/careers/${encodeURIComponent(job.id)}`,
  });
}

export default async function JobPage({ params }) {
  const { id } = await params;
  if (!/^[\w-]{1,120}$/.test(id)) notFound();
  const feed = await getCareers();
  if (feed.status !== "ready") return <><CareersBackLink /><CareersUnavailable heading="h1" /></>;
  const job = feed.jobs.find((item) => item.id === id);
  if (!job) notFound();
  return (
    <article className={styles.section}>
      <CareersBackLink />
      <header className={styles.jobHeader}>
        <p className={styles.eyebrow}>First Medical Associates</p>
        <h1>{job.title}</h1>
        <div className={styles.meta}>
          {job.employmentType && <span><Briefcase size={17} aria-hidden="true" />{job.employmentType}</span>}
          {job.locations.length > 0 && <span><MapPin size={17} aria-hidden="true" />{job.locations.join(" · ")}</span>}
          {job.postedAt && <span><CalendarDays size={17} aria-hidden="true" />Posted <time dateTime={job.postedAt}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(job.postedAt))}</time></span>}
        </div>
        <a className={`${styles.primaryButton} ${styles.mobileApply}`} href={job.applyUrl}>Apply now <ArrowUpRight size={19} aria-hidden="true" /></a>
      </header>
      <div className={styles.detailGrid}>
        <section className={styles.description} aria-labelledby="job-description">
          <h2 id="job-description">About this role</h2>
          {job.descriptionHtml
            ? <div className={styles.prose} dangerouslySetInnerHTML={{ __html: job.descriptionHtml }} />
            : <p>Visit the application portal for the full details of this position.</p>}
        </section>
        <aside className={styles.applyCard} aria-labelledby="apply-heading">
          <span className={styles.jobIcon} aria-hidden="true"><Briefcase size={26} /></span>
          <h2 id="apply-heading">Your next chapter starts here.</h2>
          <p>Ready to join our team? Continue to our application portal to apply for this position.</p>
          <a className={styles.primaryButton} href={job.applyUrl}>Apply now <ArrowUpRight size={19} aria-hidden="true" /></a>
          <span className={styles.applyNote}>Applications are completed through ADP.</span>
        </aside>
      </div>
      <div className={styles.bottomApply}>
        <CareersBackLink />
        <a className={styles.primaryButton} href={job.applyUrl}>Apply now <ArrowUpRight size={19} aria-hidden="true" /></a>
      </div>
    </article>
  );
}
