import styles from "./careers.module.css";

export default function CareersLoading() {
  return <section className={`${styles.section} ${styles.state}`} role="status" aria-live="polite">
    <p>Loading career opportunities…</p>
  </section>;
}
