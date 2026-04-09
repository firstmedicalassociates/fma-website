"use client";

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from "react";
import {
  PROVIDER_LOCATION_OPTIONS,
  formatProviderList,
  normalizeProviderSlug,
  normalizeStringList,
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
    linkUrl: initialProvider?.linkUrl || "",
    locations: Array.isArray(initialProvider?.locations) ? initialProvider.locations : [],
    languages: Array.isArray(initialProvider?.languages) ? initialProvider.languages : [],
  };
}

export default function ProviderForm({ mode = "create", initialProvider }) {
  const initialValues = getInitialValues(initialProvider);
  const isEditMode = mode === "edit";

  const [name, setName] = useState(initialValues.name);
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(isEditMode || Boolean(initialValues.slug));
  const [bio, setBio] = useState(initialValues.bio);
  const [imageUrl, setImageUrl] = useState(initialValues.imageUrl);
  const [linkUrl, setLinkUrl] = useState(initialValues.linkUrl);
  const [imageStatus, setImageStatus] = useState("idle");
  const [selectedLocations, setSelectedLocations] = useState(initialValues.locations);
  const [languagesInput, setLanguagesInput] = useState(formatProviderList(initialValues.languages));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const languages = useMemo(() => normalizeStringList(languagesInput), [languagesInput]);
  const selectedLocationLabel = useMemo(() => {
    if (selectedLocations.length === 0) return "Select locations";
    return formatProviderList(selectedLocations);
  }, [selectedLocations]);

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

  function toggleLocation(location) {
    setSelectedLocations((current) =>
      current.includes(location)
        ? current.filter((item) => item !== location)
        : [...current, location]
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

  async function handleSubmit() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch(
        isEditMode ? `/api/admin/providers/${initialValues.id}` : "/api/admin/providers",
        {
          method: isEditMode ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            slug,
            bio,
            imageUrl,
            linkUrl,
            locations: selectedLocations,
            languages,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || `Failed to ${isEditMode ? "update" : "create"} provider.`);
        return;
      }

      window.location.href = `/providers/${data.slug}`;
    } catch {
      setStatus("error");
      setMessage(`Failed to ${isEditMode ? "update" : "create"} provider.`);
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <h1 className="admin-title">{isEditMode ? "Edit Provider" : "New Provider"}</h1>
          <p className="admin-subtitle">
            {isEditMode
              ? "Update the provider profile, locations, languages, or replace the image."
              : "Add a directory profile with a 600x600 image and all connected locations."}
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">Builder</span>
          <button
            className="builder-button"
            type="button"
            onClick={handleSubmit}
            disabled={status === "saving" || imageStatus === "uploading"}
          >
            {status === "saving"
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save changes"
                : "Create provider"}
          </button>
        </div>
      </header>

      <section className="builder-shell">
        <div className="builder-card">
          <h2>Provider details</h2>

          <div className="builder-field">
            <label>Name (required)</label>
            <input
              className="builder-input"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Example name"
            />
          </div>

          <div className="builder-field">
            <label>Title (required)</label>
            <input
              className="builder-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="M.D., PA-C, FNP-BC"
            />
          </div>

          <div className="builder-field">
            <label>Slug (required)</label>
            <input
              className="builder-input"
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="example-name"
            />
          </div>

          <div className="builder-field">
            <label>Bio (required)</label>
            <textarea
              className="builder-textarea"
              rows={8}
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Short provider bio"
            />
          </div>

          <div className="builder-field">
            <label>
              {isEditMode
                ? "Replace provider image (600x600)"
                : "Provider image (required, 600x600)"}
            </label>
            <input
              className="builder-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleImageUpload}
            />
            <p className="admin-subtitle" style={{ marginTop: 6 }}>
              The upload is rejected unless the image is exactly 600 by 600 pixels.
            </p>
            {imageUrl ? (
              <p className="admin-subtitle" style={{ marginTop: 6 }}>
                Current image: {imageUrl}
              </p>
            ) : null}
          </div>

          <div className="builder-field">
            <label>Button link (optional)</label>
            <input
              className="builder-input"
              type="url"
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com/provider-page"
            />
            <p className="admin-subtitle" style={{ marginTop: 6 }}>
              If set, a button will appear on the provider page.
            </p>
          </div>

          <div className="builder-field">
            <label>Locations (required)</label>
            <details className="builder-multiselect">
              <summary className="builder-multiselect-trigger">
                <span>{selectedLocationLabel}</span>
                <span>{selectedLocations.length} selected</span>
              </summary>
              <div className="builder-multiselect-menu">
                {PROVIDER_LOCATION_OPTIONS.map((location) => (
                  <label className="builder-option" key={location}>
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes(location)}
                      onChange={() => toggleLocation(location)}
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </details>
            {selectedLocations.length > 0 ? (
              <div className="builder-chip-row">
                {selectedLocations.map((location) => (
                  <span className="builder-chip" key={location}>
                    {location}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="builder-field">
            <label>Languages (required)</label>
            <textarea
              className="builder-textarea"
              rows={4}
              value={languagesInput}
              onChange={(event) => setLanguagesInput(event.target.value)}
              placeholder="English, Spanish"
            />
            <p className="admin-subtitle" style={{ marginTop: 6 }}>
              Separate languages with commas or one per line.
            </p>
            {languages.length > 0 ? (
              <div className="builder-chip-row">
                {languages.map((language) => (
                  <span className="builder-chip" key={language}>
                    {language}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {message ? (
            <p
              className="admin-subtitle"
              style={{ color: status === "error" || imageStatus === "error" ? "#b42318" : "" }}
            >
              {message}
            </p>
          ) : null}
        </div>

        <div className="builder-preview">
          <h2>Preview</h2>
          <article className="provider-preview-card">
            {imageUrl ? (
              <img src={imageUrl} alt={name || "Provider image"} />
            ) : (
              <div className="provider-preview-placeholder">600x600 image</div>
            )}

            <div style={{ textAlign: "center" }}>
              <h3 style={{ marginBottom: 6 }}>{name || "Example name"}</h3>
              <p className="admin-subtitle" style={{ fontWeight: 700 }}>
                {title || "Example title"}
              </p>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <strong>Locations</strong>
                <p className="admin-subtitle" style={{ marginTop: 6 }}>
                  {formatProviderList(selectedLocations) || "Select one or more locations"}
                </p>
              </div>
              <div>
                <strong>Languages</strong>
                <p className="admin-subtitle" style={{ marginTop: 6 }}>
                  {formatProviderList(languages) || "Add one or more languages"}
                </p>
              </div>
              <div>
                <strong>Bio</strong>
                <p className="admin-subtitle" style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>
                  {bio || "Provider bio preview"}
                </p>
              </div>
              <div>
                <strong>Button link</strong>
                <p className="admin-subtitle" style={{ marginTop: 6, wordBreak: "break-all" }}>
                  {linkUrl || "No button link set"}
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </>
  );
}
