"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const ELEMENT_TYPES = [
  { value: "h2", label: "Heading 2" },
  { value: "p", label: "Paragraph" },
  { value: "ul", label: "List" },
];

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createElement(type, content = "") {
  return {
    id: createId(type),
    type,
    content,
  };
}

function createSection(elements = []) {
  return {
    id: createId("section"),
    elements,
  };
}

function normalizeSections(sections) {
  if (!Array.isArray(sections)) return [];

  return sections.map((section) => ({
    id: section.id || createId("section"),
    elements: Array.isArray(section.elements)
      ? section.elements.map((element) => ({
          id: element.id || createId(element.type || "element"),
          type: element.type || "p",
          content: element.content || "",
        }))
      : [],
  }));
}

function moveElementInSections(sections, source, target) {
  if (!source || !target) return sections;

  const isDroppingOnSelf =
    source.sectionId === target.sectionId && source.elementId === target.elementId;
  if (isDroppingOnSelf) return sections;

  let movedElement = null;

  const sectionsWithoutSource = sections.map((section) => {
    if (section.id !== source.sectionId) return section;

    const sourceIndex = section.elements.findIndex((element) => element.id === source.elementId);
    if (sourceIndex === -1) return section;

    movedElement = section.elements[sourceIndex];

    return {
      ...section,
      elements: section.elements.filter((element) => element.id !== source.elementId),
    };
  });

  if (!movedElement) return sections;

  return sectionsWithoutSource.map((section) => {
    if (section.id !== target.sectionId) return section;

    const nextElements = [...section.elements];

    if (!target.elementId || target.position === "end") {
      nextElements.push(movedElement);
      return { ...section, elements: nextElements };
    }

    const targetIndex = nextElements.findIndex((element) => element.id === target.elementId);
    if (targetIndex === -1) {
      nextElements.push(movedElement);
      return { ...section, elements: nextElements };
    }

    const insertionIndex = target.position === "after" ? targetIndex + 1 : targetIndex;
    nextElements.splice(insertionIndex, 0, movedElement);

    return { ...section, elements: nextElements };
  });
}

function getDropPosition(event) {
  const bounds = event.currentTarget.getBoundingClientRect();
  return event.clientY >= bounds.top + bounds.height / 2 ? "after" : "before";
}

function DragHandle() {
  return (
    <span className="builder-drag-dots" aria-hidden="true">
      {Array.from({ length: 6 }).map((_, index) => (
        <span key={index} />
      ))}
    </span>
  );
}

export default function PostForm({ mode, initialPost }) {
  const [pageTitle, setPageTitle] = useState(initialPost?.pageTitle || "");
  const [metaTitle, setMetaTitle] = useState(initialPost?.metaTitle || "");
  const [metaDescription, setMetaDescription] = useState(initialPost?.metaDescription || "");
  const [header, setHeader] = useState(initialPost?.header || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [featuredImageUrl, setFeaturedImageUrl] = useState(initialPost?.featuredImageUrl || "");
  const [featuredImageAlt, setFeaturedImageAlt] = useState(initialPost?.featuredImageAlt || "");
  const [featuredImageStatus, setFeaturedImageStatus] = useState("idle");
  const [footer, setFooter] = useState(initialPost?.footer || "");
  const [sections, setSections] = useState(() => normalizeSections(initialPost?.sections));
  const [nextType, setNextType] = useState("h2");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [draggedElement, setDraggedElement] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);

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

  function moveElement(source, target) {
    setSections((current) => moveElementInSections(current, source, target));
  }

  function handleElementDragStart(event, sectionId, elementId) {
    const payload = { sectionId, elementId };
    setDraggedElement(payload);
    setDropTarget(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", JSON.stringify(payload));
  }

  function handleElementDragEnd() {
    setDraggedElement(null);
    setDropTarget(null);
  }

  function handleElementDragOver(event, sectionId, elementId) {
    if (!draggedElement) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (draggedElement.sectionId === sectionId && draggedElement.elementId === elementId) {
      setDropTarget(null);
      return;
    }

    setDropTarget({
      sectionId,
      elementId,
      position: getDropPosition(event),
    });
  }

  function handleSectionDragOver(event, sectionId) {
    if (!draggedElement) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({
      sectionId,
      elementId: null,
      position: "end",
    });
  }

  function handleElementDrop(event, sectionId, elementId) {
    event.preventDefault();
    if (!draggedElement) return;

    moveElement(draggedElement, {
      sectionId,
      elementId,
      position: getDropPosition(event),
    });
    setDraggedElement(null);
    setDropTarget(null);
  }

  function handleSectionDrop(event, sectionId) {
    event.preventDefault();
    if (!draggedElement) return;

    moveElement(draggedElement, {
      sectionId,
      elementId: null,
      position: "end",
    });
    setDraggedElement(null);
    setDropTarget(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const payload = {
      title: pageTitle,
      metaTitle,
      metaDescription,
      header,
      slug,
      featuredImageUrl,
      featuredImageAlt,
      footer,
      sections: sections.map((section) => ({
        elements: section.elements.map((element) => ({
          type: element.type,
          content: element.content,
        })),
      })),
    };

    const endpoint = mode === "edit" ? `/api/admin/posts/${initialPost.id}` : "/api/admin/posts";
    const method = mode === "edit" ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to save post.");
        return;
      }

      window.location.href = mode === "edit" ? "/admin/posts" : `/blog/${data.slug}`;
    } catch {
      setStatus("error");
      setMessage("Failed to save post.");
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

  const isEditing = mode === "edit";
  const heading = isEditing ? "Edit Blog Post" : "New Blog Post";
  const subtitle = isEditing
    ? "Update post details, refresh content sections, and keep the live article current."
    : "Header and footer are required. Add sections and place elements inside them.";
  const primaryLabel = isEditing ? "Save changes" : "Publish";
  const primaryBusyLabel = isEditing ? "Saving..." : "Publishing...";
  const messageClassName = `status-message ${status === "error" ? "is-error" : ""}`;

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Post builder</span>
          <h1 className="admin-title">{heading}</h1>
          <p className="admin-subtitle">{subtitle}</p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">Builder</span>
          <button
            className="builder-button admin-primary-cta"
            type="submit"
            form="post-builder-form"
            disabled={status === "saving"}
          >
            {status === "saving" ? primaryBusyLabel : primaryLabel}
          </button>
        </div>
      </header>

      <section className="builder-shell post-builder-shell">
        <div className="builder-card">
          <div className="builder-card-header">
            <h2>Structure</h2>
            <p className="builder-card-copy">
              Build the article structure, upload a featured image, and drag elements
              between sections while you preview the final post.
            </p>
          </div>

          <form className="builder-form" id="post-builder-form" onSubmit={handleSubmit}>
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
                required={!featuredImageUrl}
              />
              {featuredImageUrl ? (
                <p className="builder-helper-text">Uploaded: {featuredImageUrl}</p>
              ) : null}
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
                sections.map((section, sectionIndex) => {
                  const isSectionDropTarget =
                    dropTarget?.sectionId === section.id && dropTarget?.elementId === null;

                  return (
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
                        <div
                          className={`builder-drop-zone ${isSectionDropTarget ? "is-active" : ""}`}
                          onDragOver={(event) => handleSectionDragOver(event, section.id)}
                          onDrop={(event) => handleSectionDrop(event, section.id)}
                        >
                          {draggedElement
                            ? "Drop here to place the element in this section."
                            : "No elements in this section yet."}
                        </div>
                      ) : (
                        <>
                          {section.elements.map((element, index) => {
                            const isDragging =
                              draggedElement?.sectionId === section.id &&
                              draggedElement?.elementId === element.id;
                            const isDropBefore =
                              dropTarget?.sectionId === section.id &&
                              dropTarget?.elementId === element.id &&
                              dropTarget?.position === "before";
                            const isDropAfter =
                              dropTarget?.sectionId === section.id &&
                              dropTarget?.elementId === element.id &&
                              dropTarget?.position === "after";

                            return (
                              <div
                                className={`builder-element builder-sortable-card${
                                  isDragging ? " is-dragging" : ""
                                }${isDropBefore ? " is-drop-before" : ""}${
                                  isDropAfter ? " is-drop-after" : ""
                                }`}
                                key={element.id}
                                onDragOver={(event) =>
                                  handleElementDragOver(event, section.id, element.id)
                                }
                                onDrop={(event) =>
                                  handleElementDrop(event, section.id, element.id)
                                }
                              >
                                <div className="builder-element-header">
                                  <div className="builder-element-title">
                                    <button
                                      aria-label={`Move ${element.type.toUpperCase()} element`}
                                      className="builder-drag-handle"
                                      draggable
                                      onDragEnd={handleElementDragEnd}
                                      onDragStart={(event) =>
                                        handleElementDragStart(event, section.id, element.id)
                                      }
                                      title="Drag to reorder or move this element"
                                      type="button"
                                    >
                                      <DragHandle />
                                    </button>
                                    <span>
                                      {index + 1}. {element.type.toUpperCase()}
                                    </span>
                                  </div>
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
                            );
                          })}

                          <div
                            className={`builder-drop-zone ${isSectionDropTarget ? "is-active" : ""}`}
                            onDragOver={(event) => handleSectionDragOver(event, section.id)}
                            onDrop={(event) => handleSectionDrop(event, section.id)}
                          >
                            {draggedElement
                              ? "Drop here to move the element to the end of this section."
                              : "Drag with the dotted handle to reorder within this section or move to another one."}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
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

            <div className="builder-row">
              <button
                className="builder-button admin-primary-cta"
                type="submit"
                disabled={status === "saving"}
              >
                {status === "saving" ? primaryBusyLabel : primaryLabel}
              </button>
              <Link className="builder-button secondary" href="/admin/posts">
                Cancel
              </Link>
            </div>

            {featuredImageStatus === "uploading" ? (
              <p className={messageClassName}>Uploading featured image...</p>
            ) : null}
            {message ? <p className={messageClassName}>{message}</p> : null}
          </form>
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
