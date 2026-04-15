"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  formatProviderList,
  normalizeProviderSlug,
  normalizeStringList,
  resolveLocationTitles,
} from "../../../lib/providers";

function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image."));
    };

    image.src = objectUrl;
  });
}

function getInitialValues(initialProvider) {
  return {
    id: initialProvider?.id || "",
    name: initialProvider?.name || "",
    title: initialProvider?.title || "",
    slug: initialProvider?.slug || "",
    bio: initialProvider?.bio || "",
    imageUrl: initialProvider?.imageUrl || "",
    imageAlt: initialProvider?.imageAlt || "",
    linkUrl: initialProvider?.linkUrl || "",
    locations: Array.isArray(initialProvider?.locations) ? initialProvider.locations : [],
    languages: Array.isArray(initialProvider?.languages) ? initialProvider.languages : [],
    sortOrder: String(initialProvider?.sortOrder ?? 0),
    isActive: initialProvider?.isActive ?? true,
  };
}

export default function ProviderForm({ mode = "create", initialProvider, locationOptions = [] }) {
  const initialValues = getInitialValues(initialProvider);
  const isEditMode = mode === "edit";

  const [name, setName] = useState(initialValues.name);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(isEditMode || Boolean(initialValues.slug));
  const [bio, setBio] = useState(initialValues.bio);
  const [imageUrl, setImageUrl] = useState(initialValues.imageUrl);
  const [imageAlt, setImageAlt] = useState(initialValues.imageAlt);
  const [linkUrl, setLinkUrl] = useState(initialValues.linkUrl);
  const [imageStatus, setImageStatus] = useState("idle");
  const [selectedLocations, setSelectedLocations] = useState(initialValues.locations);
  const [languagesInput, setLanguagesInput] = useState(formatProviderList(initialValues.languages));
  const [sortOrder, setSortOrder] = useState(initialValues.sortOrder);
  const [isActive, setIsActive] = useState(initialValues.isActive);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const locationTitleBySlug = useMemo(
    () => Object.fromEntries(locationOptions.map((location) => [location.slug, location.title])),
    [locationOptions]
  );

  const selectedLocationLabel = useMemo(() => {
    if (selectedLocations.length === 0) return "Select one or more locations";
    return formatProviderList(resolveLocationTitles(selectedLocations, locationTitleBySlug));
  }, [locationTitleBySlug, selectedLocations]);

  const languages = useMemo(() => normalizeStringList(languagesInput), [languagesInput]);

  function handleNameChange(event) {
    const value = event.target.value;
    setName(value);

    if (!slugTouched) {
      setSlug(normalizeProviderSlug(value));
    }
  }

  function handleSlugChange(event) {
    setSlugTouched(true);
    setSlug(normalizeProviderSlug(event.target.value));
  }

  function toggleLocation(locationSlug) {
    setSelectedLocations((current) =>
      current.includes(locationSlug)
        ? current.filter((value) => value !== locationSlug)
        : [...current, locationSlug]
    );
  }

  async function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageStatus("uploading");
    setMessage("");

    try {
      const dimensions = await getImageDimensions(file);
      if (dimensions.width !== 600 || dimensions.height !== 600) {
        setImageStatus("error");
        setMessage("Provider images must be exactly 600x600 pixels.");
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "provider");

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setImageStatus("error");
        setMessage(data.error || "Image upload failed.");
        return;
      }

      setImageUrl(data.url);
      setImageStatus("done");
    } catch {
      setImageStatus("error");
      setMessage("Image upload failed.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const endpoint = isEditMode ? `/api/admin/providers/${initialValues.id}` : "/api/admin/providers";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          title,
          slug,
          bio,
          imageUrl,
          imageAlt,
          linkUrl,
          locations: selectedLocations,
          languages,
          sortOrder,
          isActive,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || `Failed to ${isEditMode ? "update" : "create"} provider.`);
        return;
      }

      window.location.href = `/admin/providers/${data.id || initialValues.id}`;
    } catch {
      setStatus("error");
      setMessage(`Failed to ${isEditMode ? "update" : "create"} provider.`);
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Provider editor</span>
          <h1 className="admin-title">{isEditMode ? "Edit Provider" : "Add Provider"}</h1>
          <p className="admin-subtitle">
            Use location assignments to control which doctors appear on each location page.
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">{isActive ? "Visible" : "Hidden"}</span>
          <button
            className="builder-button admin-primary-cta"
            type="submit"
            form="provider-form"
            disabled={status === "saving" || imageStatus === "uploading"}
          >
            {status === "saving"
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save provider"
                : "Create provider"}
          </button>
        </div>
      </header>

      <section className="builder-shell">
        <div className="builder-card">
          <div className="builder-card-header">
            <h2>Profile setup</h2>
            <p className="builder-card-copy">
              Add the provider profile, upload the square headshot, and assign the provider to the
              correct locations.
            </p>
          </div>

          <form className="builder-form" id="provider-form" onSubmit={handleSubmit}>
            <div className="builder-grid-two">
              <div className="builder-field">
                <label>Name (required)</label>
                <input
                  className="builder-input"
                  type="text"
                  value={name}
                  onChange={handleNameChange}
                  placeholder="Provider full name"
                  required
                />
              </div>

              <div className="builder-field">
                <label>Title (required)</label>
                <input
                  className="builder-input"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="M.D., FNP-BC, PA-C"
                  required
                />
              </div>
            </div>

            <div className="builder-grid-two">
              <div className="builder-field">
                <label>Slug (required)</label>
                <input
                  className="builder-input"
                  type="text"
                  value={slug}
                  onChange={handleSlugChange}
                  placeholder="jane-doe"
                  required
                />
              </div>

              <div className="builder-field">
                <label>Sort order</label>
                <input
                  className="builder-input"
                  type="number"
                  value={sortOrder}
                  onChange={(event) => setSortOrder(event.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="builder-field">
              <label>Bio (required)</label>
              <textarea
                className="builder-textarea"
                rows={8}
                value={bio}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Short provider biography"
                required
              />
            </div>

            <div className="builder-grid-two">
              <div className="builder-field">
                <label>Provider image (required, 600x600)</label>
                <input
                  className="builder-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleImageUpload}
                />
                <p className="builder-helper-text">
                  Uploads are validated to exactly 600 by 600 pixels.
                </p>
                {imageUrl ? <p className="builder-helper-text">Current image: {imageUrl}</p> : null}
              </div>

              <div className="builder-field">
                <label>Image alt text</label>
                <input
                  className="builder-input"
                  type="text"
                  value={imageAlt}
                  onChange={(event) => setImageAlt(event.target.value)}
                  placeholder="Describe the provider image"
                />
              </div>
            </div>

            <div className="builder-field">
              <label>Booking link (optional)</label>
              <input
                className="builder-input"
                type="url"
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                placeholder="https://example.com/provider-booking"
              />
              <p className="builder-helper-text">
                If present, location cards can use this as the provider call-to-action.
              </p>
            </div>

            <div className="builder-field">
              <label>Locations (required)</label>
              {locationOptions.length === 0 ? (
                <div className="builder-list-block">
                  <p className="builder-helper-text">
                    No locations exist yet. Create a location first, then come back to assign this
                    provider.
                  </p>
                </div>
              ) : (
                <>
                  <details className="builder-multiselect">
                    <summary className="builder-multiselect-trigger">
                      <span>{selectedLocationLabel}</span>
                      <span>{selectedLocations.length} selected</span>
                    </summary>
                    <div className="builder-multiselect-menu">
                      {locationOptions.map((location) => (
                        <label className="builder-option" key={location.slug}>
                          <input
                            type="checkbox"
                            checked={selectedLocations.includes(location.slug)}
                            onChange={() => toggleLocation(location.slug)}
                          />
                          <span>{location.title}</span>
                        </label>
                      ))}
                    </div>
                  </details>

                  {selectedLocations.length > 0 ? (
                    <div className="location-preview-chip-row">
                      {resolveLocationTitles(selectedLocations, locationTitleBySlug).map((title) => (
                        <span className="admin-pill" key={title}>
                          {title}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
            </div>

            <div className="builder-field">
              <label>Languages (required)</label>
              <textarea
                className="builder-textarea"
                rows={4}
                value={languagesInput}
                onChange={(event) => setLanguagesInput(event.target.value)}
                placeholder="English, Spanish"
                required
              />
              <p className="builder-helper-text">
                Separate languages with commas or one per line.
              </p>
            </div>

            <label className="builder-checkbox">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              <span>Show this provider on the public site</span>
            </label>

            <div className="builder-row">
              <button
                className="builder-button admin-primary-cta"
                type="submit"
                disabled={status === "saving" || imageStatus === "uploading"}
              >
                {status === "saving"
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save provider"
                    : "Create provider"}
              </button>
              <Link className="builder-button secondary" href="/admin/providers">
                Cancel
              </Link>
            </div>

            {message ? (
              <p
                className={`status-message ${
                  status === "error" || imageStatus === "error" ? "is-error" : ""
                }`}
              >
                {message}
              </p>
            ) : null}
          </form>
        </div>

        <div className="builder-preview">
          <p className="builder-preview-kicker">Live preview</p>
          <h2>Provider card</h2>
          <article className="location-preview-card">
            {imageUrl ? (
              <img
                className="builder-preview-image"
                src={imageUrl}
                alt={imageAlt || name || "Provider image"}
              />
            ) : (
              <div className="builder-preview-placeholder">600x600 provider image</div>
            )}

            <div className="location-preview-body">
              <div>
                <p className="location-preview-slug">/providers/{slug || "provider-slug"}</p>
                <h2>{name || "Provider name"}</h2>
                <p className="location-preview-intro">{title || "Provider title"}</p>
              </div>

              <div className="location-preview-meta-grid">
                <div className="location-preview-meta-item">
                  <span>Status</span>
                  <strong>{isActive ? "Visible on the site" : "Hidden from public pages"}</strong>
                </div>
                <div className="location-preview-meta-item">
                  <span>Locations</span>
                  <strong>
                    {selectedLocations.length > 0
                      ? formatProviderList(resolveLocationTitles(selectedLocations, locationTitleBySlug))
                      : "Assign one or more locations"}
                  </strong>
                </div>
                <div className="location-preview-meta-item">
                  <span>Languages</span>
                  <strong>{formatProviderList(languages) || "Add one or more languages"}</strong>
                </div>
                <div className="location-preview-meta-item">
                  <span>Booking CTA</span>
                  <strong>{linkUrl || "Uses provider detail page"}</strong>
                </div>
              </div>

              <p className="location-preview-intro">
                {bio || "Provider bio preview will render here as you type."}
              </p>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
