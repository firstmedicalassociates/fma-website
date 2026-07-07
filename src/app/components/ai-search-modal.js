"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GENERAL_BOOK_APPOINTMENT_URL } from "../lib/config/site";
import { AI_SEARCH_REQUEST_EVENT } from "../lib/ai-search-events";
import {
  PUBLIC_SEARCH_MAX_CHARACTERS,
  getNoPhiError,
  hasPotentialPhi,
  normalizePublicSearchQuery,
  NO_PHI_NOTICE,
} from "../lib/no-phi-guard";
import styles from "./ai-search-modal.module.css";

const SEARCH_MIN_CHARACTERS = 2;
const DEFAULT_LOADING_STATUSES = [
  "Reviewing doctors, services, and locations...",
  "Checking the best appointment paths...",
  "Preparing useful results and next steps...",
];
const APPOINTMENT_LOADING_STATUSES = [
  "Checking current appointment availability...",
  "Matching providers, locations, and open times...",
  "Preparing booking links...",
];
const APPOINTMENT_QUERY_PATTERN =
  /\b(available|availability|availabilities|appointment|appointments|opening|openings|slot|slots|quickest|earliest|soonest|asap|today|tomorrow|\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?))\b/i;

const DEFAULT_FEEDBACK_STATE = {
  status: "idle",
  rating: "",
  message: "",
};

function getPageContextFromPathname(pathname = "") {
  const match = String(pathname || "").match(/^\/providers\/([a-z0-9-]+)\/?$/i);
  if (!match?.[1]) return null;

  return {
    type: "provider",
    slug: match[1],
  };
}

// Matches full URLs, www URLs, US phone numbers, and email addresses in AI-generated text.
const LINK_PATTERN =
  /(https?:\/\/[^\s<>"']+[^\s<>"'.,;:)!\][“”]|www\.[a-zA-Z0-9-]+\.[^\s<>"']+[^\s<>"'.,;:)!\][“”]]|\b\d{3}-\d{3}-\d{4}\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function renderWithLinks(text) {
  if (!text) return null;
  const parts = [];
  let lastIndex = 0;
  let key = 0;
  LINK_PATTERN.lastIndex = 0;
  let match;

  while ((match = LINK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const raw = match[0];

    if (/^\d{3}-\d{3}-\d{4}$/.test(raw)) {
      parts.push(
        <a key={key++} className={styles.answerLink} href={`tel:+1${raw.replace(/-/g, "")}`}>
          {raw}
        </a>
      );
    } else if (raw.includes("@") && !raw.startsWith("http")) {
      parts.push(
        <a key={key++} className={styles.answerLink} href={`mailto:${raw}`}>
          {raw}
        </a>
      );
    } else {
      const href = raw.startsWith("www.") ? `https://${raw}` : raw;
      parts.push(
        <a key={key++} className={styles.answerLink} href={href} target="_blank" rel="noopener noreferrer">
          {raw}
        </a>
      );
    }

    lastIndex = match.index + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

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

function getLoadingStatuses(nextQuery) {
  return APPOINTMENT_QUERY_PATTERN.test(nextQuery)
    ? APPOINTMENT_LOADING_STATUSES
    : DEFAULT_LOADING_STATUSES;
}

function getAppointmentStatusText(appointmentMeta, hasAppointmentOptions) {
  if (!appointmentMeta) return "";

  if (hasAppointmentOptions || appointmentMeta.availabilityStatus === "open_slots_found") {
    return "Open online times found. Choose a slot below.";
  }

  if (appointmentMeta.availabilityStatus === "no_open_slots") {
    return "No online appointment times found right now.";
  }

  if (appointmentMeta.availabilityStatus === "provider_schedule_not_confirmed") {
    return "Provider found. Please confirm current times by booking online or calling.";
  }

  if (appointmentMeta.availabilityStatus === "unavailable") {
    return "Please confirm current times by booking online or calling.";
  }

  return "";
}

function createMessageId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function providerSlugFromHref(href = "") {
  const match = String(href || "").match(/\/providers\/([a-z0-9-]+)/i);
  return match?.[1] || "";
}

function buildSessionContext(messages = []) {
  const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant" && message.payload);
  const payload = lastAssistant?.payload;
  if (!payload) return null;

  const providerNames = new Set();
  const providerSlugs = new Set();

  for (const name of payload.appointmentMeta?.requestedProviderNames || []) {
    if (name) providerNames.add(name);
  }

  for (const option of payload.appointmentOptions || []) {
    if (option.providerName) providerNames.add(option.providerName);
    if (option.providerSlug) providerSlugs.add(option.providerSlug);
    const slug = providerSlugFromHref(option.providerUrl);
    if (slug) providerSlugs.add(slug);
  }

  for (const card of payload.cards || []) {
    const cardType = card.type || card.kind || "";
    if (cardType === "provider" && card.title) providerNames.add(card.title);
    const slug = providerSlugFromHref(card.href);
    if (slug) providerSlugs.add(slug);
  }

  for (const source of payload.sources || []) {
    const slug = providerSlugFromHref(source.url);
    if (slug) providerSlugs.add(slug);
  }

  const providerNameValues = [...providerNames].slice(0, 3);
  const providerSlugValues = [...providerSlugs].slice(0, 3);
  if (providerNameValues.length === 0 && providerSlugValues.length === 0) return null;

  return {
    lastIntent: payload.intent || "",
    lastAvailabilityStatus: payload.appointmentMeta?.availabilityStatus || "",
    providerNames: providerNameValues,
    providerSlugs: providerSlugValues,
  };
}

function getPrimaryCardHref(card = {}) {
  if (card.type === "appointment" && card.bookingUrl) return card.bookingUrl;
  return card.href || card.bookingUrl || "/search";
}

function shouldOpenCardInNewTab(card = {}) {
  const href = getPrimaryCardHref(card);
  return /^https?:\/\//i.test(href);
}

function isExternalHref(href = "") {
  return /^https?:\/\//i.test(href) || /^tel:/i.test(href) || /^mailto:/i.test(href);
}

export default function AiSearchModal({ className = "", onOpen, listenForExternalRequests = true }) {
  const pathname = usePathname();
  const inputRef = useRef(null);
  const chatStreamRef = useRef(null);
  const previousFocusRef = useRef(null);
  const loadingIntervalRef = useRef(null);
  const lockScrollYRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [state, setState] = useState("idle");
  const [statusIndex, setStatusIndex] = useState(0);
  const [loadingStatuses, setLoadingStatuses] = useState(DEFAULT_LOADING_STATUSES);
  const [helperText, setHelperText] = useState("Example: Find a primary care doctor near Rockville.");
  const [errorMessage, setErrorMessage] = useState("");
  const [conversationMessages, setConversationMessages] = useState([]);
  const [activeAssistantMessageId, setActiveAssistantMessageId] = useState("");
  const [feedbackState, setFeedbackState] = useState(DEFAULT_FEEDBACK_STATE);

  const overlayClassName = [
    styles.modal,
    isOpen ? styles.modalOpen : "",
    state === "loading" ? styles.modalLoading : "",
    state === "results" ? styles.modalResults : "",
  ]
    .filter(Boolean)
    .join(" ");

  const loadingStatus = useMemo(
    () => loadingStatuses[statusIndex] || loadingStatuses[0],
    [loadingStatuses, statusIndex]
  );
  const pageContext = useMemo(() => getPageContextFromPathname(pathname), [pathname]);

  const stopLoadingTicker = useCallback(() => {
    if (loadingIntervalRef.current) {
      window.clearInterval(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  const resetResults = useCallback(() => {
    setState("idle");
    setStatusIndex(0);
    setLoadingStatuses(DEFAULT_LOADING_STATUSES);
    setHelperText("Example: Find a primary care doctor near Rockville.");
    setErrorMessage("");
    setConversationMessages([]);
    setActiveAssistantMessageId("");
    setFeedbackState(DEFAULT_FEEDBACK_STATE);
    stopLoadingTicker();
  }, [stopLoadingTicker]);

  const openModal = useCallback(() => {
    previousFocusRef.current = document.activeElement;
    setIsOpen(true);
    resetResults();
    onOpen?.();
  }, [onOpen, resetResults]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    resetResults();
  }, [resetResults]);

  const executeSearch = useCallback(async (nextQuery, options = {}) => {
    const searchQuery = normalizePublicSearchQuery(nextQuery);
    const sessionContext = buildSessionContext(conversationMessages);

    if (searchQuery !== nextQuery) {
      setQuery(searchQuery);
    }

    if (searchQuery.length < SEARCH_MIN_CHARACTERS) {
      setHelperText(`Please enter at least ${SEARCH_MIN_CHARACTERS} characters.`);
      inputRef.current?.focus();
      return;
    }

    if (hasPotentialPhi(searchQuery)) {
      const privacyPayload = {
        summary: getNoPhiError("AI search"),
        cards: MOCK_RESULT_CARDS,
        sources: [],
        citations: [],
        appointmentOptions: [],
        appointmentMeta: null,
        clarification: null,
        recoveryActions: [],
        eventId: "",
      };

      setConversationMessages((messages) => [
        ...messages,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          payload: privacyPayload,
        },
      ]);
      setActiveAssistantMessageId("");
      setFeedbackState(DEFAULT_FEEDBACK_STATE);
      setErrorMessage("");
      setHelperText("Remove medical details and try a general FMA question.");
      setQuery("");
      setState("results");
      inputRef.current?.focus();
      return;
    }

    if (searchQuery.length > PUBLIC_SEARCH_MAX_CHARACTERS) {
      const tooLongPayload = {
        summary: "Please keep your question under 300 characters.",
        cards: MOCK_RESULT_CARDS,
        sources: [],
        citations: [],
        appointmentOptions: [],
        appointmentMeta: null,
        clarification: null,
        recoveryActions: [],
        eventId: "",
      };

      setConversationMessages((messages) => [
        ...messages,
        {
          id: createMessageId("assistant"),
          role: "assistant",
          payload: tooLongPayload,
        },
      ]);
      setActiveAssistantMessageId("");
      setFeedbackState(DEFAULT_FEEDBACK_STATE);
      setErrorMessage("");
      setHelperText("Shorten your question and try again.");
      setState("results");
      inputRef.current?.focus();
      return;
    }

    const assistantMessageId = createMessageId("assistant");

    stopLoadingTicker();
    setErrorMessage("");
    const nextLoadingStatuses = getLoadingStatuses(searchQuery);
    setLoadingStatuses(nextLoadingStatuses);
    setStatusIndex(0);
    setState("loading");
    setHelperText("Searching FMA with AI...");
    setActiveAssistantMessageId(assistantMessageId);
    setConversationMessages((messages) => [
      ...messages,
      {
        id: createMessageId("user"),
        role: "user",
        content: searchQuery,
      },
      {
        id: assistantMessageId,
        role: "assistant",
        status: "loading",
      },
    ]);

    loadingIntervalRef.current = window.setInterval(() => {
      setStatusIndex((current) => (current + 1) % nextLoadingStatuses.length);
    }, 900);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: searchQuery,
          pageContext,
          sessionContext,
          clarificationResponse: options.clarificationResponse === true,
        }),
      });

      const data = await response.json().catch(() => ({}));
      const structuredCards = Array.isArray(data?.ai?.structuredCards)
        ? data.ai.structuredCards.slice(0, 6)
        : [];
      const cards = structuredCards.length > 0 ? structuredCards : mapApiCards(data?.results);
      const summary = data?.ai?.answer || data?.ai?.error || DEFAULT_SUMMARY;
      const sources = Array.isArray(data?.ai?.sources) ? data.ai.sources.slice(0, 3) : [];
      const citations = Array.isArray(data?.ai?.citations) ? data.ai.citations : [];
      const appointmentOptions = Array.isArray(data?.ai?.appointmentOptions)
        ? data.ai.appointmentOptions.slice(0, 4)
        : [];
      const appointmentMeta =
        data?.ai?.appointmentMeta && typeof data.ai.appointmentMeta === "object"
          ? data.ai.appointmentMeta
          : null;
      const eventId = typeof data?.ai?.eventId === "string" ? data.ai.eventId : "";
      const intent = typeof data?.ai?.intent === "string" ? data.ai.intent : "";
      const resolution =
        data?.ai?.resolution && typeof data.ai.resolution === "object" ? data.ai.resolution : null;
      const clarification =
        data?.ai?.clarification && typeof data.ai.clarification === "object"
          ? data.ai.clarification
          : null;
      const recoveryActions = Array.isArray(data?.ai?.recoveryActions)
        ? data.ai.recoveryActions.slice(0, 4)
        : [];
      const code = typeof data?.ai?.code === "string" ? data.ai.code : "";

      const nextPayload = {
        summary,
        cards,
        sources,
        citations,
        appointmentOptions,
        appointmentMeta,
        intent,
        code,
        resolution,
        clarification,
        recoveryActions,
        eventId,
      };

      setConversationMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                status: "done",
                payload: nextPayload,
              }
            : message
        )
      );
      setFeedbackState(DEFAULT_FEEDBACK_STATE);
      setHelperText("Refine your search or ask a follow-up question.");
      setErrorMessage(response.ok && data?.ok ? "" : "AI search is unavailable right now. Showing suggested paths.");
      setState("results");
    } catch (_error) {
      const fallbackPayload = {
        summary: DEFAULT_SUMMARY,
        cards: MOCK_RESULT_CARDS,
        sources: [],
        citations: [],
        appointmentOptions: [],
        appointmentMeta: null,
        clarification: null,
        recoveryActions: [],
        eventId: "",
      };

      setConversationMessages((messages) =>
        messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                status: "done",
                payload: fallbackPayload,
              }
            : message
        )
      );
      setFeedbackState(DEFAULT_FEEDBACK_STATE);
      setErrorMessage("AI search is unavailable right now. Showing suggested paths.");
      setHelperText("Refine your search or ask a follow-up question.");
      setState("results");
    } finally {
      stopLoadingTicker();
    }
  }, [conversationMessages, pageContext, stopLoadingTicker]);

  async function submitFeedback(eventId, rating, tags = []) {
    if (!eventId || feedbackState.status === "submitting") return;

    setFeedbackState({
      status: "submitting",
      rating,
      message: "",
    });

    try {
      const response = await fetch("/api/ai-search/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          rating,
          tags,
        }),
      });

      setFeedbackState({
        status: response.ok ? "sent" : "error",
        rating: response.ok ? rating : "",
        message: response.ok ? "Feedback saved." : "Feedback could not be saved.",
      });
    } catch {
      setFeedbackState({
        status: "error",
        rating: "",
        message: "Feedback could not be saved.",
      });
    }
  }

  async function runSearch(event) {
    event.preventDefault();
    if (state === "loading") return;
    await executeSearch(query.trim());
  }

  function runChoiceAction(action) {
    if (!action) return;
    if (action.type === "query" && action.query) {
      void executeSearch(action.query, { clarificationResponse: true });
    }
  }

  useEffect(() => {
    if (!isOpen || !chatStreamRef.current) return;

    chatStreamRef.current.scrollTo({
      top: chatStreamRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [conversationMessages, isOpen, state]);

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
  }, [closeModal, isOpen, stopLoadingTicker]);

  useEffect(() => {
    return () => stopLoadingTicker();
  }, [stopLoadingTicker]);

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

            <section aria-label="AI search conversation" className={styles.chatShell}>
              <div aria-live="polite" className={styles.chatStream} ref={chatStreamRef}>
                {conversationMessages.length === 0 ? (
                  <article className={`${styles.chatMessage} ${styles.assistantMessage}`}>
                    <span className={styles.messageAvatar} aria-hidden="true">
                      <SparkleIcon className={styles.sparkleIcon} />
                    </span>
                    <div className={`${styles.messageBubble} ${styles.assistantBubble} ${styles.welcomeBubble}`}>
                      <div className={styles.assistantHeader}>FMA AI</div>
                      <p className={styles.answerText}>Ask a question about FMA providers, locations, services, insurance, or appointments.</p>
                    </div>
                  </article>
                ) : null}

                {conversationMessages.map((message) => {
                  if (message.role === "user") {
                    return (
                      <article className={`${styles.chatMessage} ${styles.userMessage}`} key={message.id}>
                        <div className={`${styles.messageBubble} ${styles.userBubble}`}>
                          {message.content}
                        </div>
                      </article>
                    );
                  }

                  if (message.status === "loading") {
                    return (
                      <article className={`${styles.chatMessage} ${styles.assistantMessage}`} key={message.id}>
                        <span className={styles.messageAvatar} aria-hidden="true">
                          <SparkleIcon className={styles.sparkleIcon} />
                        </span>
                        <div className={`${styles.messageBubble} ${styles.assistantBubble} ${styles.thinkingBubble}`}>
                          <div className={styles.thinkingHead}>
                            <span aria-hidden="true" className={styles.thinkingOrb} />
                            Searching First Medical Associates...
                          </div>
                          <div className={styles.thinkingStatus}>{loadingStatus}</div>
                          <div aria-hidden="true" className={styles.loadingDots}>
                            <span />
                            <span />
                            <span />
                          </div>
                        </div>
                      </article>
                    );
                  }

                  const payload = message.payload || {
                    summary: DEFAULT_SUMMARY,
                    cards: [],
                    appointmentOptions: [],
                    appointmentMeta: null,
                    clarification: null,
                    recoveryActions: [],
                    eventId: "",
                  };
                  const messageAppointmentStatusText = getAppointmentStatusText(
                    payload.appointmentMeta,
                    payload.appointmentOptions.length > 0
                  );
                  const clarificationChoices = Array.isArray(payload.clarification?.choices)
                    ? payload.clarification.choices
                    : [];
                  const recoveryActions = Array.isArray(payload.recoveryActions)
                    ? payload.recoveryActions
                    : [];
                  const showFeedback =
                    message.id === activeAssistantMessageId &&
                    payload.eventId &&
                    !payload.clarification;

                  return (
                    <article className={`${styles.chatMessage} ${styles.assistantMessage}`} key={message.id}>
                      <span className={styles.messageAvatar} aria-hidden="true">
                        <SparkleIcon className={styles.sparkleIcon} />
                      </span>
                      <div className={`${styles.messageBubble} ${styles.assistantBubble}`}>
                        <div className={styles.assistantHeader}>FMA AI</div>
                        {payload.resolution?.label ? (
                          <div className={styles.resolutionPill}>{payload.resolution.label}</div>
                        ) : null}
                        <p className={styles.answerText}>{renderWithLinks(payload.summary)}</p>

                        {clarificationChoices.length > 0 ? (
                          <div className={styles.choiceActions}>
                            {clarificationChoices.map((choice) => {
                              if (choice.type === "link" && choice.href) {
                                const external = isExternalHref(choice.href);
                                const choiceBody = (
                                  <>
                                    <strong>{choice.label}</strong>
                                    {choice.description ? <span>{choice.description}</span> : null}
                                  </>
                                );

                                return external ? (
                                  <a
                                    className={styles.choiceAction}
                                    href={choice.href}
                                    key={`${choice.type}-${choice.value || choice.label}`}
                                    rel="noopener noreferrer"
                                    target={/^https?:\/\//i.test(choice.href) ? "_blank" : undefined}
                                  >
                                    {choiceBody}
                                  </a>
                                ) : (
                                  <Link
                                    className={styles.choiceAction}
                                    href={choice.href}
                                    key={`${choice.type}-${choice.value || choice.label}`}
                                  >
                                    {choiceBody}
                                  </Link>
                                );
                              }

                              return (
                                <button
                                  className={styles.choiceAction}
                                  key={`${choice.type}-${choice.value || choice.label}`}
                                  onClick={() => runChoiceAction(choice)}
                                  type="button"
                                >
                                  <strong>{choice.label}</strong>
                                  {choice.description ? <span>{choice.description}</span> : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {messageAppointmentStatusText ? (
                          <div className={styles.appointmentStatus}>
                            <span>Current availability</span>
                            <strong>{messageAppointmentStatusText}</strong>
                          </div>
                        ) : null}

                        {payload.appointmentOptions.length > 0 ? (
                          <div className={styles.appointmentOptions}>
                            {payload.appointmentOptions.map((option) => (
                              <article
                                className={styles.appointmentOption}
                                key={`${option.providerId}-${option.date}-${option.startTime}`}
                              >
                                <div>
                                  <span className={styles.appointmentTime}>{option.displayTime}</span>
                                  <h4>{option.providerName}</h4>
                                  <p>
                                    {[option.providerTitle, option.locationName].filter(Boolean).join(" | ")}
                                  </p>
                                </div>
                                <div className={styles.appointmentLinks}>
                                  {option.providerUrl ? (
                                    <Link className={styles.appointmentSecondaryLink} href={option.providerUrl}>
                                      View profile
                                    </Link>
                                  ) : null}
                                  <a
                                    className={styles.appointmentBookLink}
                                    href={option.bookingUrl}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                  >
                                    Book appointment
                                  </a>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : null}

                        {recoveryActions.length > 0 ? (
                          <div className={styles.recoveryActions}>
                            {recoveryActions.map((action) => {
                              if (action.type === "query" && action.query) {
                                return (
                                  <button
                                    className={styles.recoveryAction}
                                    key={`${action.type}-${action.value || action.label}`}
                                    onClick={() => runChoiceAction(action)}
                                    type="button"
                                  >
                                    {action.label}
                                  </button>
                                );
                              }

                              if (action.href) {
                                const external = isExternalHref(action.href);
                                return external ? (
                                  <a
                                    className={styles.recoveryAction}
                                    href={action.href}
                                    key={`${action.type}-${action.value || action.label}`}
                                    rel="noopener noreferrer"
                                    target={/^https?:\/\//i.test(action.href) ? "_blank" : undefined}
                                  >
                                    {action.label}
                                  </a>
                                ) : (
                                  <Link
                                    className={styles.recoveryAction}
                                    href={action.href}
                                    key={`${action.type}-${action.value || action.label}`}
                                  >
                                    {action.label}
                                  </Link>
                                );
                              }

                              return null;
                            })}
                          </div>
                        ) : null}

                        {payload.cards?.filter((card) => card.type !== "appointment").length > 0 ? (
                          <div className={styles.structuredCards}>
                            {payload.cards
                              .filter((card) => card.type !== "appointment")
                              .slice(0, 4)
                              .map((card) => {
                                const href = getPrimaryCardHref(card);
                                const external = shouldOpenCardInNewTab(card);
                                const cardBody = (
                                  <>
                                    <div className={styles.structuredCardHeader}>
                                      <span>{card.type || "result"}</span>
                                      <h4>{card.title}</h4>
                                      {card.subtitle ? <p>{card.subtitle}</p> : null}
                                    </div>
                                    {Array.isArray(card.details) && card.details.length > 0 ? (
                                      <ul className={styles.structuredDetails}>
                                        {card.details.slice(0, 3).map((detail) => (
                                          <li key={detail}>{detail}</li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    {Array.isArray(card.badges) && card.badges.length > 0 ? (
                                      <div className={styles.structuredBadges}>
                                        {card.badges.slice(0, 4).map((badge) => (
                                          <span key={badge}>{badge}</span>
                                        ))}
                                      </div>
                                    ) : null}
                                    <span className={styles.structuredAction}>
                                      {card.actionLabel || "Open"}
                                    </span>
                                  </>
                                );

                                return external ? (
                                  <a
                                    className={styles.structuredCard}
                                    href={href}
                                    key={`${card.type}-${card.title}-${href}`}
                                    rel="noopener noreferrer"
                                    target="_blank"
                                  >
                                    {cardBody}
                                  </a>
                                ) : (
                                  <Link
                                    className={styles.structuredCard}
                                    href={href}
                                    key={`${card.type}-${card.title}-${href}`}
                                  >
                                    {cardBody}
                                  </Link>
                                );
                              })}
                          </div>
                        ) : null}

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

                        {showFeedback ? (
                          <div className={styles.feedbackPanel}>
                            <span>Was this helpful?</span>
                            <div className={styles.feedbackButtons}>
                              <button
                                aria-pressed={feedbackState.rating === "helpful"}
                                className={styles.feedbackButton}
                                disabled={feedbackState.status === "submitting"}
                                onClick={() => submitFeedback(payload.eventId, "helpful", ["good_match"])}
                                type="button"
                              >
                                Helpful
                              </button>
                              <button
                                aria-pressed={feedbackState.rating === "not_helpful"}
                                className={styles.feedbackButton}
                                disabled={feedbackState.status === "submitting"}
                                onClick={() => submitFeedback(payload.eventId, "not_helpful", ["too_generic"])}
                                type="button"
                              >
                                Needs work
                              </button>
                            </div>
                            {feedbackState.message ? (
                              <p className={styles.feedbackMessage}>{feedbackState.message}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </article>
                  );
                })}

                {errorMessage ? <p className={styles.errorNotice}>{errorMessage}</p> : null}
              </div>

              <form className={styles.chatComposer} onSubmit={runSearch}>
                <div className={styles.chatInputRow}>
                  <SparkleIcon className={styles.inputIcon} />
                  <textarea
                    aria-label="Ask FMA AI"
                    className={styles.searchInput}
                    maxLength={PUBLIC_SEARCH_MAX_CHARACTERS}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Ask about doctors, services, locations, insurance, or appointments..."
                    ref={inputRef}
                    rows={2}
                    value={query}
                  />
                </div>

                <div className={styles.composerFooter}>
                  <span className={styles.helperText}>{helperText}</span>
                  <button className={styles.submitButton} disabled={state === "loading"} type="submit">
                    {state === "loading" ? "Searching" : "Search"}
                  </button>
                </div>

              </form>
            </section>

            <div className={`${styles.privacyHint} ${styles.modalPrivacyHint}`}>
              {NO_PHI_NOTICE}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
