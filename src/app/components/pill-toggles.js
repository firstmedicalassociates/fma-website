import Link from "next/link";
import styles from "./pill-toggles.module.css";

function joinClassNames(...values) {
  return values.filter(Boolean).join(" ");
}

function renderIcon(Icon) {
  if (!Icon) return null;
  return (
    <span className={styles.icon}>
      <Icon size={18} />
    </span>
  );
}

export function PillToggleNav({ items = [], activeHref = "", ariaLabel, fullBleedMobile = false }) {
  return (
    <nav
      aria-label={ariaLabel}
      className={joinClassNames(styles.bar, fullBleedMobile ? styles.barFullBleedMobile : "")}
    >
      {items.map((item) => {
        const isActive = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={joinClassNames(styles.item, isActive ? styles.itemActive : "")}
          >
            {renderIcon(item.icon)}
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}

export function PillToggleButtons({
  items = [],
  activeValue = "",
  onSelect,
  ariaLabel,
  fullBleedMobile = false,
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={joinClassNames(styles.bar, fullBleedMobile ? styles.barFullBleedMobile : "")}
    >
      {items.map((item) => {
        const isActive = item.value === activeValue;
        return (
          <button
            key={item.value}
            type="button"
            className={joinClassNames(styles.item, isActive ? styles.itemActive : "")}
            onClick={() => onSelect?.(item.value)}
          >
            {renderIcon(item.icon)}
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
