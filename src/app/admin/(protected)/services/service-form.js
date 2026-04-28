"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  SERVICE_ICON_OPTIONS,
  normalizeServiceIcon,
  normalizeServicePageContent,
  normalizeServiceSlug,
} from "../../../lib/services";

const STAGES = [
  {
    id: "card",
    label: "Card",
    description: "Directory card fields used on /services.",
  },
  {
    id: "page",
    label: "Service Page",
    description: "Full template content used on /service/[slug].",
  },
];

function stringifyFeatureRows(features = []) {
  return features
    .map((feature) => `${feature.title || ""} | ${feature.description || ""}`)
    .join("\n");
}

function parseFeatureRows(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [titlePart, ...descriptionParts] = line.split("|");
      return {
        title: String(titlePart || "").trim(),
        description: String(descriptionParts.join("|") || "").trim(),
      };
    })
    .filter((feature) => feature.title && feature.description);
}

function stringifyFaqRows(items = []) {
  return items
    .map((item) => `${item.question || ""} | ${item.answer || ""}`)
    .join("\n");
}

function parseFaqRows(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [questionPart, ...answerParts] = line.split("|");
      return {
        question: String(questionPart || "").trim(),
        answer: String(answerParts.join("|") || "").trim(),
      };
    })
    .filter((item) => item.question && item.answer);
}

function stringifyLines(values = []) {
  return Array.isArray(values) ? values.join("\n") : "";
}

function parseLines(value = "") {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function getInitialValues(initialService) {
  const pageContent = normalizeServicePageContent(initialService?.pageContent || {});

  return {
    id: initialService?.id || "",
    category: initialService?.category || "General Care",
    slug: initialService?.slug || normalizeServiceSlug(initialService?.title || ""),
    title: initialService?.title || "",
    description: initialService?.description || "",
    icon: initialService?.icon || "medical_services",
    isActive: initialService?.isActive ?? true,
    pageContent,
  };
}

export default function ServiceForm({ mode = "create", initialService }) {
  const initialValues = getInitialValues(initialService);
  const isEditMode = mode === "edit";

  const [activeStage, setActiveStage] = useState("card");
  const [category, setCategory] = useState(initialValues.category);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(isEditMode || Boolean(initialValues.slug));
  const [description, setDescription] = useState(initialValues.description);
  const [icon, setIcon] = useState(normalizeServiceIcon(initialValues.icon));
  const [iconSearch, setIconSearch] = useState("");
  const [isActive, setIsActive] = useState(initialValues.isActive);
  const [eyebrow, setEyebrow] = useState(initialValues.pageContent.eyebrow);
  const [heroSubtitle, setHeroSubtitle] = useState(initialValues.pageContent.heroSubtitle);
  const [heroDescription, setHeroDescription] = useState(initialValues.pageContent.heroDescription);
  const [featuresInput, setFeaturesInput] = useState(
    stringifyFeatureRows(initialValues.pageContent.features)
  );
  const [infoParagraphsInput, setInfoParagraphsInput] = useState(
    stringifyLines(initialValues.pageContent.infoParagraphs)
  );
  const [commitmentTitle, setCommitmentTitle] = useState(initialValues.pageContent.commitmentTitle);
  const [commitmentItemsInput, setCommitmentItemsInput] = useState(
    stringifyLines(initialValues.pageContent.commitmentItems)
  );
  const [detailHeading, setDetailHeading] = useState(initialValues.pageContent.detailHeading);
  const [detailParagraphsInput, setDetailParagraphsInput] = useState(
    stringifyLines(initialValues.pageContent.detailParagraphs)
  );
  const [detailLinkLabel, setDetailLinkLabel] = useState(initialValues.pageContent.detailLinkLabel);
  const [detailLinkHref, setDetailLinkHref] = useState(initialValues.pageContent.detailLinkHref);
  const [faqInput, setFaqInput] = useState(stringifyFaqRows(initialValues.pageContent.faqItems));
  const [ctaTitle, setCtaTitle] = useState(initialValues.pageContent.ctaTitle);
  const [ctaDescription, setCtaDescription] = useState(initialValues.pageContent.ctaDescription);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const normalizedIcon = normalizeServiceIcon(icon);

  const filteredIconOptions = useMemo(() => {
    const query = iconSearch.trim().toLowerCase();
    if (!query) return SERVICE_ICON_OPTIONS;

    return SERVICE_ICON_OPTIONS.filter((option) => {
      return (
        option.value.toLowerCase().includes(query) ||
        option.label.toLowerCase().includes(query)
      );
    });
  }, [iconSearch]);

  function handleTitleChange(event) {
    const value = event.target.value;
    setTitle(value);

    if (!slugTouched) {
      setSlug(normalizeServiceSlug(value));
    }
  }

  function handleSlugChange(event) {
    setSlugTouched(true);
    setSlug(normalizeServiceSlug(event.target.value));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const endpoint = isEditMode ? `/api/admin/services/${initialValues.id}` : "/api/admin/services";
    const method = isEditMode ? "PUT" : "POST";

    const pageContent = {
      eyebrow,
      heroSubtitle,
      heroDescription,
      features: parseFeatureRows(featuresInput),
      infoParagraphs: parseLines(infoParagraphsInput),
      commitmentTitle,
      commitmentItems: parseLines(commitmentItemsInput),
      detailHeading,
      detailParagraphs: parseLines(detailParagraphsInput),
      detailLinkLabel,
      detailLinkHref,
      faqItems: parseFaqRows(faqInput),
      ctaTitle,
      ctaDescription,
    };

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          slug,
          title,
          description,
          icon: normalizeServiceIcon(icon),
          pageContent,
          isActive,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || `Failed to ${isEditMode ? "update" : "create"} service.`);
        return;
      }

      window.location.href = `/admin/services/${data.id || initialValues.id}`;
    } catch {
      setStatus("error");
      setMessage(`Failed to ${isEditMode ? "update" : "create"} service.`);
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Service library</span>
          <h1 className="admin-title">{isEditMode ? "Edit Service" : "Add Service"}</h1>
          <p className="admin-subtitle">
            Manage both service cards and the full /service/[slug] template content in one flow.
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">{isActive ? "Visible" : "Hidden"}</span>
          <button
            className="builder-button admin-primary-cta"
            type="submit"
            form="service-form"
            disabled={status === "saving"}
          >
            {status === "saving"
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save service"
                : "Create service"}
          </button>
        </div>
      </header>

      <section className="builder-shell location-editor-shell">
        <aside className="location-editor-nav">
          <div>
            <p className="location-editor-nav-kicker">Service editor</p>
            <p className="builder-card-copy">Switch between card setup and service-page template content.</p>
          </div>

          <div className="location-editor-nav-list">
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                className={`location-editor-tab ${activeStage === stage.id ? "is-active" : ""}`}
                type="button"
                onClick={() => setActiveStage(stage.id)}
              >
                <span className="location-editor-tab-copy">
                  <span className="location-editor-tab-label">{stage.label}</span>
                  <span className="admin-subtitle">{stage.description}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        <article className="builder-card location-editor-stage">
          <form className="location-editor-stage-body" id="service-form" onSubmit={handleSubmit}>
            {activeStage === "card" ? (
              <div className="location-editor-panel-grid builder-grid-two">
                <div className="builder-element">
                  <div className="builder-field">
                    <label>Parent category</label>
                    <input
                      className="builder-input"
                      type="text"
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      placeholder="Primary Care"
                    />
                  </div>

                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>Title (required)</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={title}
                        onChange={handleTitleChange}
                        placeholder="Annual Physicals"
                        required
                      />
                    </div>

                    <div className="builder-field">
                      <label>Slug / route (required)</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={slug}
                        onChange={handleSlugChange}
                        placeholder="annual-physicals"
                        required
                      />
                    </div>
                  </div>

                  <div className="builder-field">
                    <label>Card description (required)</label>
                    <textarea
                      className="builder-textarea"
                      rows={5}
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Short description shown in the service directory card."
                      required
                    />
                  </div>

                  <div className="builder-field">
                    <div className="service-icon-label-row">
                      <label htmlFor="service-icon-name">Icon</label>
                      <span className="service-icon-selected-pill">
                        <span className="material-symbols-outlined" aria-hidden="true">
                          {normalizedIcon}
                        </span>
                        {normalizedIcon}
                      </span>
                    </div>
                    <input
                      id="service-icon-name"
                      className="builder-input"
                      type="text"
                      value={icon}
                      onChange={(event) => setIcon(event.target.value)}
                      placeholder="medical_services"
                    />
                    <p className="builder-helper-text">
                      Choose an icon below, or type a Material Symbols icon name manually.
                    </p>

                    <div className="service-icon-picker-shell">
                      <input
                        className="builder-input service-icon-search"
                        type="search"
                        value={iconSearch}
                        onChange={(event) => setIconSearch(event.target.value)}
                        placeholder="Search icons"
                        aria-label="Search available icons"
                      />
                      {filteredIconOptions.length > 0 ? (
                        <div className="service-icon-grid" role="listbox" aria-label="Icon chooser">
                          {filteredIconOptions.map((option) => {
                            const isSelected = normalizedIcon === option.value;
                            return (
                              <button
                                key={option.value}
                                className={`service-icon-option${isSelected ? " is-selected" : ""}`}
                                type="button"
                                title={`${option.label} (${option.value})`}
                                aria-label={`Use ${option.label} icon`}
                                aria-pressed={isSelected}
                                onClick={() => setIcon(option.value)}
                              >
                                <span className="material-symbols-outlined" aria-hidden="true">
                                  {option.value}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="builder-helper-text service-icon-empty">No icons match that search.</p>
                      )}
                    </div>
                  </div>

                  <label className="builder-checkbox">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                    />
                    <span>Show this service publicly</span>
                  </label>
                </div>

                <div className="builder-element location-preview-card">
                  <div className="location-preview-body">
                    <p className="builder-preview-kicker">Live preview</p>
                    <h2>Service card</h2>
                    <p className="location-preview-slug">{category || "General Care"}</p>
                    <h3>{title || "Service title"}</h3>
                    <p className="location-preview-intro">
                      {description || "Service description preview will render here as you type."}
                    </p>
                    <div className="location-preview-meta-grid">
                      <div className="location-preview-meta-item">
                        <span>Route</span>
                        <strong>{slug ? `/service/${slug}` : "/service/service-slug"}</strong>
                      </div>
                      <div className="location-preview-meta-item">
                        <span>Icon</span>
                        <strong className="service-icon-preview-row">
                          <span className="material-symbols-outlined service-icon-preview">
                            {normalizedIcon}
                          </span>
                          {normalizedIcon}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeStage === "page" ? (
              <div className="location-editor-panel-grid builder-grid-two">
                <div className="builder-element">
                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>Eyebrow / tag</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={eyebrow}
                        onChange={(event) => setEyebrow(event.target.value)}
                        placeholder="Primary Care"
                      />
                    </div>
                    <div className="builder-field">
                      <label>Hero subtitle</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={heroSubtitle}
                        onChange={(event) => setHeroSubtitle(event.target.value)}
                        placeholder="Your Partner in Lifelong Health"
                      />
                    </div>
                  </div>

                  <div className="builder-field">
                    <label>Hero description</label>
                    <textarea
                      className="builder-textarea"
                      rows={5}
                      value={heroDescription}
                      onChange={(event) => setHeroDescription(event.target.value)}
                      placeholder="Long intro paragraph at the top of the page."
                    />
                  </div>

                  <div className="builder-field">
                    <label>Feature rows (one per line: Title | Description)</label>
                    <textarea
                      className="builder-textarea"
                      rows={7}
                      value={featuresInput}
                      onChange={(event) => setFeaturesInput(event.target.value)}
                    />
                  </div>

                  <div className="builder-field">
                    <label>Info paragraphs (one paragraph per line)</label>
                    <textarea
                      className="builder-textarea"
                      rows={6}
                      value={infoParagraphsInput}
                      onChange={(event) => setInfoParagraphsInput(event.target.value)}
                    />
                  </div>

                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>Commitment panel title</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={commitmentTitle}
                        onChange={(event) => setCommitmentTitle(event.target.value)}
                      />
                    </div>
                    <div className="builder-field">
                      <label>Commitment items (one per line)</label>
                      <textarea
                        className="builder-textarea"
                        rows={5}
                        value={commitmentItemsInput}
                        onChange={(event) => setCommitmentItemsInput(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>Detail section heading</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={detailHeading}
                        onChange={(event) => setDetailHeading(event.target.value)}
                      />
                    </div>
                    <div className="builder-field">
                      <label>Detail link label</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={detailLinkLabel}
                        onChange={(event) => setDetailLinkLabel(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>Detail paragraphs (one per line)</label>
                      <textarea
                        className="builder-textarea"
                        rows={5}
                        value={detailParagraphsInput}
                        onChange={(event) => setDetailParagraphsInput(event.target.value)}
                      />
                    </div>
                    <div className="builder-field">
                      <label>Detail link href</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={detailLinkHref}
                        onChange={(event) => setDetailLinkHref(event.target.value)}
                        placeholder="/providers"
                      />
                    </div>
                  </div>

                  <div className="builder-field">
                    <label>FAQ rows (one per line: Question | Answer)</label>
                    <textarea
                      className="builder-textarea"
                      rows={7}
                      value={faqInput}
                      onChange={(event) => setFaqInput(event.target.value)}
                    />
                  </div>

                  <div className="builder-grid-two">
                    <div className="builder-field">
                      <label>CTA title</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={ctaTitle}
                        onChange={(event) => setCtaTitle(event.target.value)}
                      />
                    </div>
                    <div className="builder-field">
                      <label>CTA description</label>
                      <textarea
                        className="builder-textarea"
                        rows={4}
                        value={ctaDescription}
                        onChange={(event) => setCtaDescription(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="builder-element location-preview-card">
                  <div className="location-preview-body">
                    <p className="builder-preview-kicker">Page content preview</p>
                    <h2>{title || "Service title"}</h2>
                    <p className="location-preview-slug">{eyebrow || "Category tag"}</p>
                    <p className="location-preview-intro">
                      {heroSubtitle || "Hero subtitle"}
                    </p>
                    <p className="builder-helper-text">
                      Route: {slug ? `/service/${slug}` : "/service/service-slug"}
                    </p>
                    <div className="location-preview-meta-grid">
                      <div className="location-preview-meta-item">
                        <span>Feature rows</span>
                        <strong>{parseFeatureRows(featuresInput).length}</strong>
                      </div>
                      <div className="location-preview-meta-item">
                        <span>FAQ rows</span>
                        <strong>{parseFaqRows(faqInput).length}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="builder-row">
              <button
                className="builder-button admin-primary-cta"
                type="submit"
                disabled={status === "saving"}
              >
                {status === "saving"
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save service"
                    : "Create service"}
              </button>
              <Link className="builder-button secondary" href="/admin/services">
                Cancel
              </Link>
            </div>

            {message ? (
              <p className={`status-message ${status === "error" ? "is-error" : ""}`}>
                {message}
              </p>
            ) : null}
          </form>
        </article>
      </section>
    </>
  );
}
