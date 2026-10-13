import { CareersBackLink } from "../states";
import styles from "../careers.module.css";

export default function JobNotFound() {
  return <section className={`${styles.section} ${styles.state}`}>
    <h1>This position is no longer available</h1>
    <p>Explore our current openings to find another opportunity with our team.</p>
    <CareersBackLink />
  </section>;
}
