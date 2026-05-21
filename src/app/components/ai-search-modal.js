"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { GENERAL_BOOK_APPOINTMENT_URL } from "../lib/config/site";
import { AI_SEARCH_REQUEST_EVENT } from "../lib/ai-search-events";
import styles from "./ai-search-modal.module.css";

const SEARCH_MIN_CHARACTERS = 2;
const LOADING_STATUSES = [
  "Reviewing doctors, services, and locations...",
  "Checking the best appointment paths...",
  "Preparing useful results and next steps...",
];

const PROMPT_PILLS = [
  "Which doctors are accepting new patients?",
  "How do I book an appointment?",
  "What primary care services do you offer?",
  "Where is the nearest FMA location?",
];
const FOLLOWUP_PILLS = [
  "Which doctors are accepting new patients?",
  "What insurance do you accept?",
  "Where are your offices located?",
];

const DEFAULT_SUMMARY =
  "First Medical Associates can help you find care by provider, service, or location. Based on your search, these are the most useful next steps for finding the right appointment path.";

const MOCK_RESULT_CARDS = [
  {
    categoryLabel: "Provider Search",
    title: "Find a Doctor",
    description: "Search providers by specialty, city, state, or appointment type.",
    href: "/providers",
    actionLabel: "View doctor options",
  },
  {
    categoryLabel: "Primary Care",
    title: "Care Services",
    description:
      "Explore annual physicals, sick visits, preventive care, and chronic care management.",
    href: "/services",
    actionLabel: "Explore services",
  },
  {
    categoryLabel: "Locations",
    title: "Nearby Offices",
    description:
      "Find the office that works best for your appointment, provider, or service need.",
    href: "/locations",
    actionLabel: "View locations",
  },
];

function SparkleIcon({ className }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2.75 13.75 8.25 19.25 10 13.75 11.75 12 17.25 10.25 11.75 4.75 10 10.25 8.25 12 2.75Z"
        fill="currentColor"
      />
      <path
        d="M19 14.5 19.8 17.2 22.5 18 19.8 18.8 19 21.5 18.2 18.8 15.5 18 18.2 17.2 19 14.5Z"
        fill="currentColor"
        opacity="0.86"
      />
    </svg>
  );
}

function getActionLabel(item) {
  if (!item) return "Open page";
  if (item.kind === "provider") return "View doctor options";
  if (item.kind === "service") return "Explore services";
  if (item.kind === "location") return "View locations";
  if (item.kind === "article") return "Read article";
  return "Open page";
}

function mapApiCards(results = []) {
  const usable = Array.isArray(results) ? results.slice(0, 3) : [];
  if (usable.length === 0) return MOCK_RESULT_CARDS;

  return usable.map((item) => ({
    categoryLabel: item.categoryLabel || "Recommended",
    title: item.title || "Explore",
    description: item.description || "Open this page to continue.",
    href: item.href || "/search",
    actionLabel: getActionLabel(item),
  }));
}

export default function AiSearchModal({ className = "", onOpen, listenForExternalRequests = true }) {
  const inputRef = useRef(null);
  const previousFocusRef = useRef(null);
  const loadingIntervalRef = useRef(null);
  const lockScrollYRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("idle");
  const [statusIndex, setStatusIndex] = useState(0);
  const [helperText, setHelperText] = useState("Example: Find a primary care doctor near Rockville.");
  const [errorMessage, setErrorMessage] = useState("");
  const [resultPayload, setResultPayload] = useState({
    summary: DEFAULT_SUMMARY,
    cards: MOCK_RESULT_CARDS,
    sources: [],
  });

  const overlayClassName = [
    styles.modal,
    isOpen ? styles.modalOpen : "",
    state === "loading" ? styles.modalLoading : "",
    state === "results" ? styles.modalResults : "",
  ]
    .filter(Boolean)
    .join(" ");

  const loadingStatus = useMemo(() => LOADING_STATUSES[statusIndex] || LOADING_STATUSES[0], [statusIndex]);

  function stopLoadingTicker() {
    if (loadingIntervalRef.current) {
      window.clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }

  function resetResults() {
    setState("idle");
    setStatusIndex(0);
    setHelperText("Example: Find a primary care doctor near Rockville.");
    setErrorMessage("");
    setResultPayload({
      summary: DEFAULT_SUMMARY,
      cards: MOCK_RESULT_CARDS,
      sources: [],
    });
    stopLoadingTicker();
  }

  function openModal() {
    previousFocusRef.current = document.activeElement;
    setIsOpen(true);
    resetResults();
    onOpen?.();
  }

  function closeModal() {
    setIsOpen(false);
    resetResults();
  }

  function applyPrompt(text) {
    setQuery(text);
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      const end = text.length;
      inputRef.current?.setSelectionRange(end, end);
    });
  }

  async function executeSearch(nextQuery) {
    if (nextQuery.length < SEARCH_MIN_CHARACTERS) {
      setHelperText(`Please enter at least ${SEARCH_MIN_CHARACTERS} characters.`);
      inputRef.current?.focus();
      return;
    }

    stopLoadingTicker();
    setErrorMessage("");
    setStatusIndex(0);
    setState("loading");
    setHelperText("Searching FMA with AI...");

    loadingIntervalRef.current = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % LOADING_STATUSES.length);
    }, 900);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: nextQuery }),
      });

      const data = await response.json().catch(() => ({}));
      const cards = mapApiCards(data?.results);
      const summary = data?.ai?.answer || DEFAULT_SUMMARY;
      const sources = Array.isArray(data?.ai?.sources) ? data.ai.sources.slice(0, 3) : [];

      setResultPayload({ summary, cards, sources });
      setHelperText("Refine your search or ask a follow-up question.");
      setErrorMessage(response.ok && data?.ok ? "" : "Live AI search is unavailable right now. Showing suggested paths.");
      setState("results");
    } catch (_error) {
      setResultPayload({
        summary: DEFAULT_SUMMARY,
        cards: MOCK_RESULT_CARDS,
        sources: [],
      });
      setErrorMessage("Live AI search is unavailable right now. Showing suggested paths.");
      setHelperText("Refine your search or ask a follow-up question.");
      setState("results");
    } finally {
      stopLoadingTicker();
    }
  }

  async function runSearch(event) {
    event.preventDefault();
    await executeSearch(query.trim());
  }

  useEffect(() => {
    if (!isOpen) return undefined;

    lockScrollYRef.current = window.scrollY || window.pageYOffset || 0;

    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscrollBehavior = document.documentElement.style.overscrollBehavior;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyPosition = document.body.style.position;
    const previousBodyTop = document.body.style.top;
    const previousBodyLeft = document.body.style.left;
    const previousBodyRight = document.body.style.right;
    const previousBodyWidth = document.body.style.width;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "none";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${lockScrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 120);

    function onKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeModal();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      stopLoadingTicker();
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscrollBehavior;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.position = previousBodyPosition;
      document.body.style.top = previousBodyTop;
      document.body.style.left = previousBodyLeft;
      document.body.style.right = previousBodyRight;
      document.body.style.width = previousBodyWidth;
      window.scrollTo(0, lockScrollYRef.current);
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    return () => stopLoadingTicker();
  }, []);

  useEffect(() => {
    if (!listenForExternalRequests) return undefined;

    function handleSearchRequest(event) {
      const nextQuery = String(event?.detail?.query || "").trim();
      const shouldAutoRun = Boolean(event?.detail?.autoRun);

      openModal();

      setQuery(nextQuery);

      if (shouldAutoRun && nextQuery.length >= SEARCH_MIN_CHARACTERS) {
        window.setTimeout(() => {
          void executeSearch(nextQuery);
        }, 0);
      }
    }

    window.addEventListener(AI_SEARCH_REQUEST_EVENT, handleSearchRequest);

    return () => {
      window.removeEventListener(AI_SEARCH_REQUEST_EVENT, handleSearchRequest);
    };
  }, [executeSearch, listenForExternalRequests, openModal]);

  return (
    <>
      <button
        aria-label="Open Search with AI"
        className={`${styles.trigger} ${className}`.trim()}
        onClick={openModal}
        type="button"
      >
        <SparkleIcon className={styles.triggerSparkleIcon} />
        <span>AI Search</span>
      </button>

      {isOpen ? (
        <div
          aria-hidden={!isOpen}
          className={overlayClassName}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <button aria-label="Close AI search" className={styles.closeButton} onClick={closeModal} type="button">
            &times;
          </button>

          <div aria-labelledby="aiSearchTitle" aria-modal="true" className={styles.content} role="dialog">
            <div className={styles.heroBlock}>
              <div className={styles.eyebrow}>
                <SparkleIcon className={styles.sparkleIcon} />
                AI Powered Search
              </div>

              <h2 className={styles.title} id="aiSearchTitle">
                <span className={styles.titleWord}>Search</span>
                <strong className={styles.titleWord}>FMA</strong>
                <span className={styles.titleWord}>with</span>
                <strong className={styles.titleWord}>AI</strong>
                <span aria-hidden="true" className={styles.titleGlowSweep} />
              </h2>
            </div>

            <div className={styles.searchDock}>
              <form className={styles.searchPanel} onSubmit={runSearch}>
                <div className={styles.searchInner}>
                  <div className={styles.searchInputRow}>
                    <SparkleIcon className={styles.inputIcon} />
                    <textarea
                      className={styles.searchInput}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="Ask about doctors, services, locations, insurance, or appointments..."
                      ref={inputRef}
                      rows={2}
                      value={query}
                    />
                  </div>

                  <div className={styles.controls}>
                    <span className={styles.helperText}>{helperText}</span>
                    <button className={styles.submitButton} type="submit">
                      Search
                    </button>
                  </div>
                </div>
              </form>

              <div aria-label="Suggested AI searches" className={styles.suggestionChips}>
                {PROMPT_PILLS.map((pill) => (
                  <button className={styles.chip} key={pill} onClick={() => applyPrompt(pill)} type="button">
                    {pill}
                  </button>
                ))}
              </div>
            </div>

            {(state === "loading" || state === "results") ? (
              <section aria-live="polite" className={styles.stateArea}>
                {state === "loading" ? (
                  <div className={styles.loadingView}>
                    <div className={styles.thinkingCard}>
                      <div className={styles.thinkingHead}>
                        <span aria-hidden="true" className={styles.thinkingOrb} />
                        Searching First Medical Associates...
                      </div>
                      <div className={styles.thinkingStatus}>{loadingStatus}</div>
                      <div className={styles.skeletonGrid}>
                        {[0, 1, 2].map((item) => (
                          <div className={styles.skeletonCard} key={item}>
                            <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                            <div className={`${styles.skeletonLine} ${styles.skeletonLong}`} />
                            <div className={`${styles.skeletonLine} ${styles.skeletonMedium}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.resultsView}>
                    <article className={styles.answerCard}>
                      <div className={styles.answerLabel}>
                        <SparkleIcon className={styles.sparkleIcon} />
                        AI Summary
                      </div>
                      <h3>Here&apos;s the best place to start.</h3>
                      <p>{resultPayload.summary}</p>

                      <div className={styles.quickActions}>
                        <Link className={`${styles.quickAction} ${styles.quickActionPrimary}`} href={GENERAL_BOOK_APPOINTMENT_URL}>
                          Schedule Appointment
                        </Link>
                        <Link className={styles.quickAction} href="/providers">
                          Find a Doctor
                        </Link>
                        <Link className={styles.quickAction} href="/locations">
                          View Locations
                        </Link>
                      </div>

                      {resultPayload.sources.length > 0 ? (
                        <div className={styles.sourceList}>
                          {resultPayload.sources.map((source) => (
                            <Link
                              className={styles.sourcePill}
                              href={source.url || "/search"}
                              key={`${source.type || "source"}-${source.url || source.title}`}
                              onClick={closeModal}
                            >
                              <span>{source.type || "Source"}</span>
                              <strong>{source.title || "Website Page"}</strong>
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </article>

                    <div className={styles.resultsGrid}>
                      {resultPayload.cards.map((card) => (
                        <article className={styles.resultCard} key={`${card.title}-${card.href}`}>
                          <small>{card.categoryLabel}</small>
                          <h4>{card.title}</h4>
                          <p>{card.description}</p>
                          <Link className={styles.cardLink} href={card.href} onClick={closeModal}>
                            {card.actionLabel} -&gt;
                          </Link>
                        </article>
                      ))}
                    </div>

                    <div className={styles.followupSection}>
                      <p>Ask a follow-up</p>
                      <div className={styles.suggestionChips}>
                        {FOLLOWUP_PILLS.map((pill) => (
                          <button className={styles.chip} key={pill} onClick={() => applyPrompt(pill)} type="button">
                            {pill}
                          </button>
                        ))}
                      </div>
                    </div>

                    {errorMessage ? <p className={styles.errorNotice}>{errorMessage}</p> : null}
                  </div>
                )}
              </section>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
