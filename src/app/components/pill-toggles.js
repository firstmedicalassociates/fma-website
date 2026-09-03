"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { normalizeInternalPageHref } from "../lib/config/site";
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

function comparablePath(value = "") {
  const pathname = String(value || "").split(/[?#]/, 1)[0];
  return pathname === "/" ? pathname : pathname.replace(/\/+$/, "");
}

export function PillToggleNav({
  items = [],
  activeHref = "",
  ariaLabel,
  fullBleedMobile = false,
  showScrollIndicator = false,
}) {
  const barRef = useRef(null);
  const [scrollIndicator, setScrollIndicator] = useState({
    visible: false,
    width: 100,
    left: 0,
  });

  useEffect(() => {
    const bar = barRef.current;
    if (!bar || !showScrollIndicator) return undefined;

    function updateScrollIndicator() {
      const scrollRange = Math.max(0, bar.scrollWidth - bar.clientWidth);
      const width = bar.scrollWidth
        ? Math.max(20, Math.min(100, (bar.clientWidth / bar.scrollWidth) * 100))
        : 100;
      const left =
        scrollRange > 0
          ? Math.min(100 - width, Math.max(0, (bar.scrollLeft / scrollRange) * (100 - width)))
          : 0;

      setScrollIndicator({
        visible: scrollRange > 1,
        width,
        left,
      });
    }

    updateScrollIndicator();
    bar.addEventListener("scroll", updateScrollIndicator, { passive: true });
    window.addEventListener("resize", updateScrollIndicator);

    const resizeObserver =
      typeof ResizeObserver === "function" ? new ResizeObserver(updateScrollIndicator) : null;
    resizeObserver?.observe(bar);

    return () => {
      bar.removeEventListener("scroll", updateScrollIndicator);
      window.removeEventListener("resize", updateScrollIndicator);
      resizeObserver?.disconnect();
    };
  }, [items.length, showScrollIndicator]);

  return (
    <div className={styles.navWrap}>
      <nav
        ref={barRef}
        aria-label={ariaLabel}
        className={joinClassNames(
          styles.bar,
          fullBleedMobile ? styles.barFullBleedMobile : "",
          showScrollIndicator ? styles.barWithScrollIndicator : "",
        )}
      >
        {items.map((item) => {
          const isActive = comparablePath(item.href) === comparablePath(activeHref);
          return (
            <Link
              key={item.href}
              href={normalizeInternalPageHref(item.href)}
              className={joinClassNames(styles.item, isActive ? styles.itemActive : "")}
            >
              {renderIcon(item.icon)}
              {item.name}
            </Link>
          );
        })}
      </nav>
      {showScrollIndicator ? (
        <div
          aria-hidden="true"
          className={joinClassNames(
            styles.scrollTrack,
            scrollIndicator.visible ? styles.scrollTrackVisible : "",
          )}
        >
          <span
            className={styles.scrollThumb}
            style={{
              left: `${scrollIndicator.left}%`,
              width: `${scrollIndicator.width}%`,
            }}
          />
        </div>
      ) : null}
    </div>
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
