"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../page.module.css";

export default function WelcomeVideoCard({ poster, source, lightboxId = "welcome-video-lightbox" }) {
  const previewRef = useRef(null);
  const containerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsInView(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.45 },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const preview = previewRef.current;
    if (!preview) return;

    if (isHovered || isInView) {
      preview.play().catch(() => {});
      return;
    }

    preview.pause();
  }, [isHovered, isInView]);

  return (
    <a
      ref={containerRef}
      href={`#${lightboxId}`}
      className={styles.mediaCardTrigger}
      aria-label="Play welcome video"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
    >
      <video
        ref={previewRef}
        className={styles.mediaImage}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-hidden="true"
      >
        <source src={source} type="video/mp4" />
      </video>
      <div className={styles.mediaShade} aria-hidden="true" />
      <span className={styles.mediaBadge}>
        <svg className={styles.mediaBadgeIcon} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m9 7 8 5-8 5Z" />
        </svg>
        Welcome Video
      </span>
      <span className={styles.mediaWatchPill}>
        <span className={styles.mediaWatchIconWrap} aria-hidden="true">
          <svg className={styles.playIcon} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 7 8 5-8 5Z" fill="currentColor" stroke="none" />
          </svg>
        </span>
        Watch
      </span>
    </a>
  );
}

