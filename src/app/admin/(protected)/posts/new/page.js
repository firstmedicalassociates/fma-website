"use client";

import PostForm from "../post-form";
import { useMemo, useState } from "react";

const ELEMENT_TYPES = [
  { value: "h2", label: "Heading 2" },
  { value: "p", label: "Paragraph" },
  { value: "ul", label: "List" },
];

function createElement(type) {
  return {
    id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    content: "",
  };
}

function createSection() {
  return {
    id: `section-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    elements: [],
  };
}

export function LegacyNewPostBuilderPage() {
  const [pageTitle, setPageTitle] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [header, setHeader] = useState("");
  const [slug, setSlug] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [featuredImageAlt, setFeaturedImageAlt] = useState("");
  const [featuredImageStatus, setFeaturedImageStatus] = useState("idle");
  const [footer, setFooter] = useState("");
  const [sections, setSections] = useState([]);
  const [nextType, setNextType] = useState("h2");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const previewSections = useMemo(() => {
    return sections.map((section) => ({
      ...section,
      elements: section.elements.map((element) => {
        if (element.type !== "ul") return element;
        const items = element.content
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);
        return { ...element, items };
      }),
    }));
  }, [sections]);

  function addSection() {
    setSections((current) => [...current, createSection()]);
  }

  function removeSection(sectionId) {
    setSections((current) => current.filter((section) => section.id !== sectionId));
  }

  function addElement(sectionId) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? { ...section, elements: [...section.elements, createElement(nextType)] }
          : section
      )
    );
  }

  function updateElement(sectionId, elementId, value) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              elements: section.elements.map((element) =>
                element.id === elementId ? { ...element, content: value } : element
              ),
            }
          : section
      )
    );
  }

  function removeElement(sectionId, elementId) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              elements: section.elements.filter((element) => element.id !== elementId),
            }
          : section
      )
    );
  }

  async function handlePublish() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: pageTitle,
          metaTitle,
          metaDescription,
          header,
          slug,
          featuredImageUrl,
          featuredImageAlt,
          footer,
          sections,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to publish.");
        return;
      }

      window.location.href = `/blog/${data.slug}`;
    } catch {
      setStatus("error");
      setMessage("Failed to publish.");
    }
  }

  async function handleFeaturedImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFeaturedImageStatus("uploading");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setFeaturedImageStatus("error");
        setMessage(data.error || "Image upload failed.");
        return;
      }

      setFeaturedImageUrl(data.url);
      setFeaturedImageStatus("done");
    } catch {
      setFeaturedImageStatus("error");
      setMessage("Image upload failed.");
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Post builder</span>
          <h1 className="admin-title">New Blog Post</h1>
          <p className="admin-subtitle">
            Header and footer are required. Add sections and place elements inside them.
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">Builder</span>
          <button
            className="builder-button"
            type="button"
            onClick={handlePublish}
            disabled={status === "saving"}
          >
            {status === "saving" ? "Publishing..." : "Publish"}
          </button>
        </div>
      </header>

      <section className="builder-shell">
        <div className="builder-card">
          <div className="builder-card-header">
            <h2>Structure</h2>
            <p className="builder-card-copy">
              Build the article structure, upload a featured image, and preview the final
              content as you go.
            </p>
          </div>

          <div className="builder-field">
            <label>Page title (required)</label>
            <input
              className="builder-input"
              type="text"
              value={pageTitle}
              onChange={(event) => setPageTitle(event.target.value)}
              placeholder="Page title"
              required
            />
          </div>

          <div className="builder-field">
            <label>Meta title (optional)</label>
            <input
              className="builder-input"
              type="text"
              value={metaTitle}
              onChange={(event) => setMetaTitle(event.target.value)}
              placeholder="SEO title shown in search results"
            />
          </div>

          <div className="builder-field">
            <label>Meta description (optional)</label>
            <textarea
              className="builder-textarea"
              rows={3}
              value={metaDescription}
              onChange={(event) => setMetaDescription(event.target.value)}
              placeholder="Short summary for search results"
            />
          </div>

          <div className="builder-field">
            <label>Slug (required)</label>
            <input
              className="builder-input"
              type="text"
              value={slug}
              onChange={(event) => setSlug(event.target.value)}
              placeholder="blog-1"
              required
            />
          </div>

          <div className="builder-field">
            <label>Featured image (required)</label>
            <input
              className="builder-input"
              type="file"
              accept="image/*"
              onChange={handleFeaturedImageUpload}
              required
            />
            {featuredImageUrl ? <p className="builder-helper-text">Uploaded: {featuredImageUrl}</p> : null}
          </div>

          <div className="builder-field">
            <label>Featured image alt text (optional)</label>
            <input
              className="builder-input"
              type="text"
              value={featuredImageAlt}
              onChange={(event) => setFeaturedImageAlt(event.target.value)}
              placeholder="Describe the image"
            />
          </div>

          <div className="builder-field">
            <label>Header (required, renders as H1)</label>
            <input
              className="builder-input"
              type="text"
              value={header}
              onChange={(event) => setHeader(event.target.value)}
              placeholder="Post header (H1)"
              required
            />
          </div>

          <div className="admin-section">
            <button className="builder-button" type="button" onClick={addSection}>
              + Add section
            </button>
          </div>

          <div className="admin-section">
            {sections.length === 0 ? (
              <p className="builder-helper-text">
                No sections yet. Add a section, then add elements inside it.
              </p>
            ) : (
              sections.map((section, sectionIndex) => (
                <div className="builder-element" key={section.id}>
                  <div className="builder-element-header">
                    <span>Section {sectionIndex + 1}</span>
                    <button
                      className="builder-button secondary"
                      type="button"
                      onClick={() => removeSection(section.id)}
                    >
                      Remove section
                    </button>
                  </div>

                  <div className="builder-row">
                    <select
                      className="builder-select"
                      value={nextType}
                      onChange={(event) => setNextType(event.target.value)}
                    >
                      {ELEMENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <button
                      className="builder-button"
                      type="button"
                      onClick={() => addElement(section.id)}
                    >
                      + Add element
                    </button>
                  </div>

                  {section.elements.length === 0 ? (
                    <p className="builder-helper-text">No elements in this section yet.</p>
                  ) : (
                    section.elements.map((element, index) => (
                      <div className="builder-element" key={element.id}>
                        <div className="builder-element-header">
                          <span>
                            {index + 1}. {element.type.toUpperCase()}
                          </span>
                          <button
                            className="builder-button secondary"
                            type="button"
                            onClick={() => removeElement(section.id, element.id)}
                          >
                            Remove
                          </button>
                        </div>
                        {element.type === "ul" ? (
                          <textarea
                            className="builder-textarea"
                            rows={4}
                            value={element.content}
                            onChange={(event) =>
                              updateElement(section.id, element.id, event.target.value)
                            }
                            placeholder="One item per line"
                          />
                        ) : (
                          <input
                            className="builder-input"
                            type="text"
                            value={element.content}
                            onChange={(event) =>
                              updateElement(section.id, element.id, event.target.value)
                            }
                            placeholder={`Enter ${element.type.toUpperCase()} text`}
                          />
                        )}
                      </div>
                    ))
                  )}
                </div>
              ))
            )}
          </div>

          <div className="builder-field">
            <label>Footer (required)</label>
            <input
              className="builder-input"
              type="text"
              value={footer}
              onChange={(event) => setFooter(event.target.value)}
              placeholder="Post footer"
              required
            />
          </div>

          {featuredImageStatus === "uploading" ? (
            <p className="status-message">Uploading featured image...</p>
          ) : null}
          {message ? (
            <p className={`status-message ${status === "error" ? "is-error" : ""}`}>{message}</p>
          ) : null}
        </div>

        <div className="builder-preview">
          <p className="builder-preview-kicker">Preview</p>
          <h2>Preview</h2>
          <article>
            <div>
              <p className="builder-helper-text">{pageTitle || "Page title"}</p>
            </div>
            {featuredImageUrl ? (
              <img
                className="builder-preview-image"
                src={featuredImageUrl}
                alt={featuredImageAlt || pageTitle || "Featured image"}
              />
            ) : (
              <div className="builder-preview-placeholder">Featured image</div>
            )}
            <header>
              <h1>{header || "Post header (H1)"}</h1>
            </header>
            {previewSections.length === 0 ? (
              <p className="builder-helper-text">Your sections will appear here.</p>
            ) : (
              previewSections.map((section) => (
                <section key={section.id}>
                  {section.elements.map((element) => {
                    if (element.type === "h2") return <h2 key={element.id}>{element.content}</h2>;
                    if (element.type === "p") return <p key={element.id}>{element.content}</p>;
                    if (element.type === "ul") {
                      return (
                        <ul key={element.id}>
                          {(element.items || []).map((item, index) => (
                            <li key={`${element.id}-${index}`}>{item}</li>
                          ))}
                        </ul>
                      );
                    }
                    return null;
                  })}
                </section>
              ))
            )}
            <footer>
              <p>{footer || "Post footer"}</p>
            </footer>
          </article>
        </div>
      </section>
    </>
  );
}

export default function NewPostBuilderPage() {
  return <PostForm mode="create" />;
}
