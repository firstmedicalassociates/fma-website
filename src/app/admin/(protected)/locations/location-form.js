"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ImageIcon,
  Info,
  Layers3,
  MapPin,
  PhoneCall,
} from "../admin-icons";
import { normalizeLocationSlug } from "../../../lib/locations";
const STAGES = [
  {
    id: "overview",
    label: "Overview",
    description: "Core page title, route, and introductory copy.",
    Icon: Info,
    kicker: "Stage 01",
    title: "Core details",
  },
  {
    id: "contact",
    label: "Contact",
    description: "Address, phone, booking links, and office hours.",
    Icon: PhoneCall,
    kicker: "Stage 02",
    title: "Contact & hours",
  },
  {
    id: "media",
    label: "Media",
    description: "Map image, parking instructions, and supporting callouts.",
    Icon: ImageIcon,
    kicker: "Stage 03",
    title: "Media & arrival notes",
  },
  {
    id: "services",
    label: "Services",
    description: "Service groups and cards for the public services tab.",
    Icon: Layers3,
    kicker: "Stage 04",
    title: "Service builder",
  },
];

function createService() {
  return {
    id: `service-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    category: "",
    title: "",
    description: "",
  };
}

function getInitialValues(initialLocation) {
  return {
    id: initialLocation?.id || "",
    slug: initialLocation?.slug || "",
    title: initialLocation?.title || "",
    eyebrow: initialLocation?.eyebrow || "",
    accent: initialLocation?.accent || "",
    intro: initialLocation?.intro || "",
    address: initialLocation?.address || "",
    displayAddress: initialLocation?.displayAddress || "",
    phone: initialLocation?.phone || "",
    directionsUrl: initialLocation?.directionsUrl || "",
    bookingUrl: initialLocation?.bookingUrl || "",
    mapImageUrl: initialLocation?.mapImageUrl || "",
    mapImageAlt: initialLocation?.mapImageAlt || "",
    parkingTitle: initialLocation?.parkingTitle || "",
    parkingDescription: initialLocation?.parkingDescription || "",
    officeHours: Array.isArray(initialLocation?.officeHours) ? initialLocation.officeHours : [],
    services: Array.isArray(initialLocation?.services) ? initialLocation.services : [],
  };
}

function normalizeLineItems(value) {
  return String(value || "")
    .split(/\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function LocationForm({
  mode = "create",
  initialLocation,
  assignedProviderCount = 0,
}) {
  const initialValues = getInitialValues(initialLocation);
  const isEditMode = mode === "edit";

  const [activeStage, setActiveStage] = useState("overview");
  const [title, setTitle] = useState(initialValues.title);
  const [slug, setSlug] = useState(initialValues.slug);
  const [slugTouched, setSlugTouched] = useState(isEditMode || Boolean(initialValues.slug));
  const [eyebrow, setEyebrow] = useState(initialValues.eyebrow);
  const [accent, setAccent] = useState(initialValues.accent);
  const [intro, setIntro] = useState(initialValues.intro);
  const [address, setAddress] = useState(initialValues.address);
  const [displayAddress, setDisplayAddress] = useState(initialValues.displayAddress);
  const [phone, setPhone] = useState(initialValues.phone);
  const [directionsUrl, setDirectionsUrl] = useState(initialValues.directionsUrl);
  const [bookingUrl, setBookingUrl] = useState(initialValues.bookingUrl);
  const [mapImageUrl, setMapImageUrl] = useState(initialValues.mapImageUrl);
  const [mapImageAlt, setMapImageAlt] = useState(initialValues.mapImageAlt);
  const [parkingTitle, setParkingTitle] = useState(initialValues.parkingTitle);
  const [parkingDescription, setParkingDescription] = useState(initialValues.parkingDescription);
  const [officeHoursInput, setOfficeHoursInput] = useState(initialValues.officeHours.join("\n"));
  const [services, setServices] = useState(() =>
    initialValues.services.map((service, index) => ({
      id: service.id || `service-${index}`,
      category: service.category || "",
      title: service.title || "",
      description: service.description || "",
    }))
  );
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const officeHours = useMemo(() => normalizeLineItems(officeHoursInput), [officeHoursInput]);
  const activeStageConfig = STAGES.find((stage) => stage.id === activeStage) || STAGES[0];

  function handleTitleChange(event) {
    const value = event.target.value;
    setTitle(value);

    if (!slugTouched) {
      setSlug(normalizeLocationSlug(value));
    }
  }

  function handleSlugChange(event) {
    setSlugTouched(true);
    setSlug(normalizeLocationSlug(event.target.value));
  }

  function updateService(serviceId, field, value) {
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId ? { ...service, [field]: value } : service
      )
    );
  }

  function addService() {
    setServices((current) => [...current, createService()]);
  }

  function removeService(serviceId) {
    setServices((current) => current.filter((service) => service.id !== serviceId));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const endpoint = isEditMode ? `/api/admin/locations/${initialValues.id}` : "/api/admin/locations";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          eyebrow,
          accent,
          intro,
          address,
          displayAddress,
          phone,
          directionsUrl,
          bookingUrl,
          mapImageUrl,
          mapImageAlt,
          parkingTitle,
          parkingDescription,
          officeHours,
          services,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error || `Failed to ${isEditMode ? "update" : "create"} location.`);
        return;
      }

      window.location.href = `/admin/locations/${data.id || initialValues.id}`;
    } catch {
      setStatus("error");
      setMessage(`Failed to ${isEditMode ? "update" : "create"} location.`);
    }
  }

  return (
    <>
      <header className="admin-top">
        <div>
          <span className="admin-kicker">Location editor</span>
          <h1 className="admin-title">{isEditMode ? "Edit Location" : "Add Location"}</h1>
          <p className="admin-subtitle">
            This route powers the location landing page and automatically pulls in assigned providers.
          </p>
        </div>
        <div className="builder-row">
          <span className="admin-pill">{assignedProviderCount} provider{assignedProviderCount === 1 ? "" : "s"}</span>
          <button
            className="builder-button admin-primary-cta"
            type="submit"
            form="location-form"
            disabled={status === "saving"}
          >
            {status === "saving"
              ? isEditMode
                ? "Saving..."
                : "Creating..."
              : isEditMode
                ? "Save location"
                : "Create location"}
          </button>
        </div>
      </header>

      <section className="builder-shell location-editor-shell">
        <aside className="location-editor-nav">
          <div>
            <p className="location-editor-nav-kicker">Location page flow</p>
            <p className="builder-card-copy">
              Match the public landing page structure: location details, doctors, then services.
            </p>
          </div>

          <div className="location-editor-nav-list">
            {STAGES.map((stage) => {
              const Icon = stage.Icon;

              return (
                <button
                  key={stage.id}
                  className={`location-editor-tab ${activeStage === stage.id ? "is-active" : ""}`}
                  type="button"
                  onClick={() => setActiveStage(stage.id)}
                >
                  <span className="location-editor-tab-icon">
                    <Icon />
                  </span>
                  <span className="location-editor-tab-copy">
                    <span className="location-editor-tab-label">{stage.label}</span>
                    <span className="admin-subtitle">{stage.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="location-editor-workspace">
          <article className="builder-card location-editor-stage">
            <div className="location-editor-toolbar">
              <div className="location-editor-toolbar-copy">
                <p className="location-editor-stage-kicker">{activeStageConfig.kicker}</p>
                <h2 className="location-editor-stage-title">{activeStageConfig.title}</h2>
                <p className="location-editor-stage-description">{activeStageConfig.description}</p>
              </div>

              <div className="location-editor-toolbar-actions builder-row">
                {slug ? (
                  <Link className="builder-button secondary" href={slug} target="_blank" rel="noreferrer">
                    View live
                  </Link>
                ) : null}
                <Link className="builder-button secondary" href="/admin/locations">
                  Back to locations
                </Link>
              </div>
            </div>

            <form className="location-editor-stage-body" id="location-form" onSubmit={handleSubmit}>
              {activeStage === "overview" ? (
                <div className="location-editor-panel-grid builder-grid-two">
                  <div className="builder-element">
                    <div className="builder-grid-two">
                      <div className="builder-field">
                        <label>Title (required)</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={title}
                          onChange={handleTitleChange}
                          placeholder="Bethesda Practice"
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
                          placeholder="/bethesda-practice"
                          required
                        />
                      </div>
                    </div>

                    <div className="builder-grid-two">
                      <div className="builder-field">
                        <label>Eyebrow</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={eyebrow}
                          onChange={(event) => setEyebrow(event.target.value)}
                          placeholder="Stage 01: Visit Our Hub"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Accent line</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={accent}
                          onChange={(event) => setAccent(event.target.value)}
                          placeholder="Personalized primary care in Bethesda"
                        />
                      </div>
                    </div>

                    <div className="builder-field">
                      <label>Intro</label>
                      <textarea
                        className="builder-textarea"
                        rows={7}
                        value={intro}
                        onChange={(event) => setIntro(event.target.value)}
                        placeholder="Short paragraph describing the location experience."
                      />
                    </div>
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      <div>
                        <p className="location-preview-slug">{slug || "/location-path"}</p>
                        <h2>{title || "Location title"}</h2>
                        <p className="location-preview-intro">
                          {accent || intro || "Location summary and positioning copy appear here."}
                        </p>
                      </div>
                      <div className="location-preview-meta-grid">
                        <div className="location-preview-meta-item">
                          <span>Eyebrow</span>
                          <strong>{eyebrow || "Stage 01: Visit Our Hub"}</strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Assigned providers</span>
                          <strong>{assignedProviderCount}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeStage === "contact" ? (
                <div className="location-editor-panel-grid builder-grid-two">
                  <div className="builder-element">
                    <div className="builder-grid-two">
                      <div className="builder-field">
                        <label>Display address</label>
                        <textarea
                          className="builder-textarea"
                          rows={4}
                          value={displayAddress}
                          onChange={(event) => setDisplayAddress(event.target.value)}
                          placeholder={"7201 Wisconsin Ave, Suite 300\nBethesda, MD 20814"}
                        />
                      </div>

                      <div className="builder-field">
                        <label>Structured address (required)</label>
                        <textarea
                          className="builder-textarea"
                          rows={4}
                          value={address}
                          onChange={(event) => setAddress(event.target.value)}
                          placeholder="7201 Wisconsin Ave, Suite 300, Bethesda, MD 20814"
                          required
                        />
                      </div>
                    </div>

                    <div className="builder-grid-three">
                      <div className="builder-field">
                        <label>Phone</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="(301) 555-0123"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Directions URL</label>
                        <input
                          className="builder-input"
                          type="url"
                          value={directionsUrl}
                          onChange={(event) => setDirectionsUrl(event.target.value)}
                          placeholder="https://maps.google.com/..."
                        />
                      </div>

                      <div className="builder-field">
                        <label>Booking URL</label>
                        <input
                          className="builder-input"
                          type="url"
                          value={bookingUrl}
                          onChange={(event) => setBookingUrl(event.target.value)}
                          placeholder="https://example.com/book"
                        />
                      </div>
                    </div>

                    <div className="builder-field">
                      <label>Office hours</label>
                      <textarea
                        className="builder-textarea"
                        rows={7}
                        value={officeHoursInput}
                        onChange={(event) => setOfficeHoursInput(event.target.value)}
                        placeholder={"Mon - Fri: 8:00 AM - 6:00 PM\nSaturday: 9:00 AM - 1:00 PM"}
                      />
                      <p className="builder-helper-text">Use one line per row.</p>
                    </div>
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      <h2>Contact preview</h2>
                      <div className="location-preview-meta-grid">
                        <div className="location-preview-meta-item">
                          <span>Address</span>
                          <strong>{displayAddress || address || "Add the office address"}</strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Phone</span>
                          <strong>{phone || "Add the main phone line"}</strong>
                        </div>
                      </div>
                      <div className="builder-list-block">
                        <div className="builder-list-header">
                          <h4>Office hours</h4>
                          <p>{officeHours.length} row(s)</p>
                        </div>
                        {officeHours.length === 0 ? (
                          <p className="builder-helper-text">Hours will appear here line by line.</p>
                        ) : (
                          officeHours.map((hours) => <p key={hours}>{hours}</p>)
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeStage === "media" ? (
                <div className="location-editor-panel-grid builder-grid-two">
                  <div className="builder-element">
                    <div className="builder-grid-two">
                      <div className="builder-field">
                        <label>Map / hero image URL</label>
                        <input
                          className="builder-input"
                          type="url"
                          value={mapImageUrl}
                          onChange={(event) => setMapImageUrl(event.target.value)}
                          placeholder="https://example.com/map-image.jpg"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Map image alt text</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={mapImageAlt}
                          onChange={(event) => setMapImageAlt(event.target.value)}
                          placeholder="Bethesda location map"
                        />
                      </div>
                    </div>

                    <div className="builder-grid-two">
                      <div className="builder-field">
                        <label>Parking title</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={parkingTitle}
                          onChange={(event) => setParkingTitle(event.target.value)}
                          placeholder="Validated parking available"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Parking description</label>
                        <textarea
                          className="builder-textarea"
                          rows={5}
                          value={parkingDescription}
                          onChange={(event) => setParkingDescription(event.target.value)}
                          placeholder="Enter via Wisconsin Avenue. Bring your ticket for validation."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      {mapImageUrl ? (
                        <img
                          className="builder-preview-image"
                          src={mapImageUrl}
                          alt={mapImageAlt || title || "Location image"}
                        />
                      ) : (
                        <div className="builder-preview-placeholder">Location hero / map image</div>
                      )}

                      <div className="builder-list-block">
                        <div className="builder-list-header">
                          <h4>{parkingTitle || "Parking callout"}</h4>
                        </div>
                        <p>{parkingDescription || "Parking notes and arrival instructions will appear here."}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeStage === "services" ? (
                <div className="location-editor-panel-grid">
                  <div className="builder-element">
                    <div className="builder-section-heading">
                      <div>
                        <h3>Services</h3>
                        <p>Each card appears in the services tab on the public location page.</p>
                      </div>
                      <button className="builder-button" type="button" onClick={addService}>
                        Add service
                      </button>
                    </div>

                    {services.length === 0 ? (
                      <div className="builder-list-block">
                        <p className="builder-helper-text">
                          No services yet. Add cards to build the services tab.
                        </p>
                      </div>
                    ) : (
                      <div className="builder-inline-group">
                        {services.map((service, index) => (
                          <div className="builder-list-block" key={service.id}>
                            <div className="builder-list-header">
                              <div>
                                <h4>Service {index + 1}</h4>
                                <p>{service.category || "General Care"}</p>
                              </div>
                              <button
                                className="builder-button secondary danger"
                                type="button"
                                onClick={() => removeService(service.id)}
                              >
                                Remove
                              </button>
                            </div>

                            <div className="builder-grid-three">
                              <div className="builder-field">
                                <label>Category</label>
                                <input
                                  className="builder-input"
                                  type="text"
                                  value={service.category}
                                  onChange={(event) =>
                                    updateService(service.id, "category", event.target.value)
                                  }
                                  placeholder="Primary Care"
                                />
                              </div>

                              <div className="builder-field">
                                <label>Title</label>
                                <input
                                  className="builder-input"
                                  type="text"
                                  value={service.title}
                                  onChange={(event) =>
                                    updateService(service.id, "title", event.target.value)
                                  }
                                  placeholder="Annual Physicals"
                                />
                              </div>

                              <div className="builder-field">
                                <label>Description</label>
                                <textarea
                                  className="builder-textarea"
                                  rows={4}
                                  value={service.description}
                                  onChange={(event) =>
                                    updateService(service.id, "description", event.target.value)
                                  }
                                  placeholder="Short description shown on the card."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      <h2>Services preview</h2>
                      {services.length === 0 ? (
                        <p className="builder-helper-text">
                          Service cards will appear here once you start adding them.
                        </p>
                      ) : (
                        <div className="builder-inline-group">
                          {services.map((service) => (
                            <div className="location-preview-meta-item" key={`preview-${service.id}`}>
                              <span>{service.category || "General Care"}</span>
                              <strong>{service.title || "Service title"}</strong>
                              <p className="location-preview-intro">
                                {service.description || "Short service description"}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="builder-row">
                <button className="builder-button admin-primary-cta" type="submit" disabled={status === "saving"}>
                  {status === "saving"
                    ? isEditMode
                      ? "Saving..."
                      : "Creating..."
                    : isEditMode
                      ? "Save location"
                      : "Create location"}
                </button>
                <Link className="builder-button secondary" href="/admin/locations">
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
        </div>
      </section>
    </>
  );
}
