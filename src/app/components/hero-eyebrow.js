import styles from "./hero-eyebrow.module.css";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

export default function HeroEyebrow({
  children,
  className = "",
  dotClassName = "",
  as: Component = "p",
}) {
  return (
    <Component className={joinClassNames(styles.eyebrow, className)}>
      <span aria-hidden="true" className={joinClassNames(styles.dot, dotClassName)} />
      <span>{children}</span>
    </Component>
  );
}
