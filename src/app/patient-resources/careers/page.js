import Link from "next/link";
import { ArrowUpRight, Briefcase, MapPin, ArrowRight } from "lucide-react";
import { getCareers } from "../../lib/careers";
import { buildStaticMetadata } from "../../lib/seo";
import { CareersUnavailable } from "./states";
import styles from "./careers.module.css";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = buildStaticMetadata({
  title: "Careers & Open Jobs | First Medical Associates",
  description: "Explore current job openings at First Medical Associates. View job responsibilities, qualifications, and apply online.",
  pathname: "/patient-resources/careers",
});

export default async function CareersPage() {
  const feed = await getCareers();
  if (feed.status !== "ready") return <CareersUnavailable />;
  return (
    <section className={styles.section} aria-labelledby="available-jobs">
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="available-jobs">Available jobs</h2>
          <p>Explore our current openings and find the right fit for you.</p>
        </div>
        <span className={styles.count}>{feed.jobs.length} {feed.jobs.length === 1 ? "opening" : "openings"}</span>
      </div>
      {feed.jobs.length ? (
        <ul className={styles.jobList}>
          {feed.jobs.map((job) => (
            <li key={job.id}>
              <Link className={styles.jobCard} href={`/patient-resources/careers/${encodeURIComponent(job.id)}/`}>
                <span className={styles.jobIcon} aria-hidden="true"><Briefcase size={26} /></span>
                <div className={styles.jobContent}>
                  <h3>{job.title}</h3>
                  <div className={styles.meta}>
                    {job.employmentType && <span><Briefcase size={15} aria-hidden="true" />{job.employmentType}</span>}
                    {job.locations.length > 0 && <span><MapPin size={15} aria-hidden="true" />{job.locations.join(" · ")}</span>}
                  </div>
                  {job.summary && <p className={styles.summary}>{job.summary}</p>}
                </div>
                <span className={styles.viewJob}>View job <ArrowUpRight size={19} aria-hidden="true" /></span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className={styles.state}>
          <Briefcase size={32} aria-hidden="true" />
          <h3>No open positions right now</h3>
          <p>Thank you for your interest in joining our team. Please check back for new opportunities.</p>
        </div>
      )}
      <div className={styles.aboutTeam}>
        <div><h3>Make a difference every day.</h3><p>Get to know the people and purpose behind First Medical Associates.</p></div>
        <Link href="/about/">About our team <ArrowRight size={17} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
