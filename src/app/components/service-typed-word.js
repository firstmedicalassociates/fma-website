"use client";

import { useEffect, useMemo, useState } from "react";

const TYPE_SPEED_MS = 95;
const DELETE_SPEED_MS = 58;
const HOLD_AFTER_TYPE_MS = 1200;
const PAUSE_BEFORE_NEXT_MS = 180;

export default function ServiceTypedWord({
  words = [],
  widthCh = 0,
  wrapperClassName = "",
  textClassName = "",
  caretClassName = "",
}) {
  const safeWords = useMemo(
    () => words.map((word) => String(word || "").trim()).filter(Boolean),
    [words],
  );
  const [wordIndex, setWordIndex] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (safeWords.length === 0 || reducedMotion) return;

    const currentWord = safeWords[wordIndex];
    let timeoutId;

    if (!isDeleting && charCount < currentWord.length) {
      timeoutId = setTimeout(() => setCharCount((count) => count + 1), TYPE_SPEED_MS);
    } else if (!isDeleting && charCount === currentWord.length) {
      timeoutId = setTimeout(() => setIsDeleting(true), HOLD_AFTER_TYPE_MS);
    } else if (isDeleting && charCount > 0) {
      timeoutId = setTimeout(() => setCharCount((count) => count - 1), DELETE_SPEED_MS);
    } else {
      timeoutId = setTimeout(() => {
        setIsDeleting(false);
        setWordIndex((index) => (index + 1) % safeWords.length);
      }, PAUSE_BEFORE_NEXT_MS);
    }

    return () => clearTimeout(timeoutId);
  }, [safeWords, wordIndex, charCount, isDeleting, reducedMotion]);

  if (safeWords.length === 0) return null;

  const activeWord = safeWords[wordIndex];
  const visibleWord = reducedMotion ? safeWords[0] : activeWord.slice(0, charCount);
  const renderedWord = visibleWord.length > 0 ? visibleWord : "\u00A0";

  return (
    <span
      className={wrapperClassName}
      aria-live="polite"
      style={{ "--typed-word-width": widthCh > 0 ? `${widthCh}ch` : undefined }}
    >
      <span className={textClassName}>{renderedWord}</span>
      <span className={caretClassName} aria-hidden="true" />
    </span>
  );
}
