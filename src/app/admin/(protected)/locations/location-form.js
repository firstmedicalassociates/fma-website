"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Info,
  Layers3,
  PhoneCall,
  X,
} from "../admin-icons";
import {
  OFFICE_HOUR_DAYS,
  OFFICE_HOUR_TIME_OPTIONS,
  buildDisplayAddress,
  buildStructuredAddress,
  formatOfficeHourRange,
  normalizeLocationSlug,
  normalizeOfficeHours,
  resolveLocationAddressParts,
} from "../../../lib/locations";
import { formatServiceLabel, resolveServiceTitles } from "../../../lib/services";
const STAGES = [
  {
    id: "overview",
    label: "Overview",
    description: "Core page title, route, introductory copy, and resource links.",
    Icon: Info,
    kicker: "Stage 01",
    title: "Core details",
  },
  {
    id: "contact",
    label: "Contact",
    description: "Address, phone, and office hours.",
    Icon: PhoneCall,
    kicker: "Stage 02",
    title: "Contact & hours",
  },
  {
    id: "media",
    label: "Media",
    description: "Location image and supporting media.",
    Icon: ImageIcon,
    kicker: "Stage 03",
    title: "Media",
  },
  {
    id: "services",
    label: "Services",
    description: "Assign existing shared services to this location.",
    Icon: Layers3,
    kicker: "Stage 04",
    title: "Service assignments",
  },
];

function createOfficeHourRow(overrides = {}) {
  return {
    id: overrides.id || `hours-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    day: overrides.day || "",
    startTime: overrides.startTime || "",
    endTime: overrides.endTime || "",
    closed: Boolean(overrides.closed),
    label: overrides.label || "",
  };
}

function moveItem(values, fromIndex, toIndex) {
  if (fromIndex < 0 || toIndex < 0 || fromIndex >= values.length || toIndex >= values.length) {
    return values;
  }

  const nextValues = [...values];
  const [item] = nextValues.splice(fromIndex, 1);
  nextValues.splice(toIndex, 0, item);
  return nextValues;
}

function getInitialOfficeHourRows(value) {
  const officeHours = normalizeOfficeHours(Array.isArray(value) ? value : []);

  if (officeHours.length === 0) {
    return OFFICE_HOUR_DAYS.map((day) =>
      createOfficeHourRow({
        id: `hours-${day.value}`,
        day: day.value,
        startTime: day.value === "Sunday" || day.value === "Saturday" ? "" : "08:00",
        endTime: day.value === "Sunday" || day.value === "Saturday" ? "" : "17:00",
        closed: day.value === "Sunday" || day.value === "Saturday",
      })
    );
  }

  const rows = officeHours.map((hours, index) =>
    createOfficeHourRow({
      ...hours,
      id: `hours-${index}`,
    })
  );
  const existingDays = new Set(rows.map((row) => row.day).filter(Boolean));
  const missingDayRows = OFFICE_HOUR_DAYS.filter((day) => !existingDays.has(day.value)).map((day) =>
    createOfficeHourRow({
      id: `hours-${day.value}`,
      day: day.value,
      closed: true,
    })
  );

  return [...rows, ...missingDayRows];
}

function getInitialValues(initialLocation) {
  const addressParts = resolveLocationAddressParts(initialLocation || {});

  return {
    id: initialLocation?.id || "",
    slug: initialLocation?.slug || "",
    title: initialLocation?.title || "",
    eyebrow: initialLocation?.eyebrow || "",
    accent: initialLocation?.accent || "",
    intro: initialLocation?.intro || "",
    address: initialLocation?.address || "",
    streetAddress: addressParts.streetAddress,
    addressCity: addressParts.addressCity,
    addressState: addressParts.addressState,
    postalCode: addressParts.postalCode,
    addressCountry: addressParts.addressCountry,
    phone: initialLocation?.phone || "",
    directPhone: initialLocation?.directPhone || "",
    callTextPhone: initialLocation?.callTextPhone || "",
    hideOfficePhone: Boolean(initialLocation?.hideOfficePhone),
    directionsUrl: initialLocation?.directionsUrl || "",
    bookingUrl: initialLocation?.bookingUrl || "",
    reviewUrl: initialLocation?.reviewUrl || "",
    mapImageUrl: initialLocation?.mapImageUrl || "",
    mapImageAlt: initialLocation?.mapImageAlt || "",
    officeHours: normalizeOfficeHours(
      Array.isArray(initialLocation?.officeHours) ? initialLocation.officeHours : []
    ),
    serviceIds: Array.isArray(initialLocation?.serviceIds) ? initialLocation.serviceIds : [],
  };
}

function hasOfficeHourInput(row) {
  return Boolean(row?.day || row?.startTime || row?.endTime || row?.closed);
}

function hasCompleteOfficeHourInput(row) {
  return Boolean(row?.day && (row?.closed || (row?.startTime && row?.endTime)));
}

function serializeOfficeHourRows(rows) {
  return rows
    .map((row) => {
      if (row.label && !hasOfficeHourInput(row)) {
        return { label: row.label };
      }

      if (!hasCompleteOfficeHourInput(row)) {
        return null;
      }

      if (row.closed) {
        return {
          day: row.day,
          closed: true,
        };
      }

      return {
        day: row.day,
        startTime: row.startTime,
        endTime: row.endTime,
      };
    })
    .filter(Boolean);
}

function sortOfficeHourRows(rows) {
  return [...rows].sort((first, second) => {
    const firstDayIndex = OFFICE_HOUR_DAYS.findIndex((day) => day.value === first.day);
    const secondDayIndex = OFFICE_HOUR_DAYS.findIndex((day) => day.value === second.day);

    if (firstDayIndex !== secondDayIndex) return firstDayIndex - secondDayIndex;
    return 0;
  });
}

export default function LocationForm({
  mode = "create",
  initialLocation,
  assignedProviderCount = 0,
  serviceOptions = [],
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
  const [streetAddress, setStreetAddress] = useState(initialValues.streetAddress);
  const [addressCity, setAddressCity] = useState(initialValues.addressCity);
  const [addressState, setAddressState] = useState(initialValues.addressState);
  const [postalCode, setPostalCode] = useState(initialValues.postalCode);
  const [addressCountry, setAddressCountry] = useState(initialValues.addressCountry);
  const [phone, setPhone] = useState(initialValues.phone);
  const [directPhone, setDirectPhone] = useState(initialValues.directPhone);
  const [callTextPhone, setCallTextPhone] = useState(initialValues.callTextPhone);
  const [hideOfficePhone, setHideOfficePhone] = useState(initialValues.hideOfficePhone);
  const [directionsUrl, setDirectionsUrl] = useState(initialValues.directionsUrl);
  const [bookingUrl, setBookingUrl] = useState(initialValues.bookingUrl);
  const [reviewUrl, setReviewUrl] = useState(initialValues.reviewUrl);
  const [mapImageUrl, setMapImageUrl] = useState(initialValues.mapImageUrl);
  const [mapImageAlt, setMapImageAlt] = useState(initialValues.mapImageAlt);
  const [officeHourRows, setOfficeHourRows] = useState(() =>
    getInitialOfficeHourRows(initialValues.officeHours)
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState(initialValues.serviceIds);
  const [imageStatus, setImageStatus] = useState("idle");
  const [imageMessage, setImageMessage] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const officeHours = useMemo(() => serializeOfficeHourRows(officeHourRows), [officeHourRows]);
  const officeHourPreviewRows = useMemo(
    () => officeHours.map((hours) => formatOfficeHourRange(hours)).filter(Boolean),
    [officeHours]
  );
  const addressParts = useMemo(
    () => ({
      streetAddress,
      addressCity,
      addressState,
      postalCode,
      addressCountry,
    }),
    [addressCity, addressCountry, addressState, postalCode, streetAddress]
  );
  const address = useMemo(() => buildStructuredAddress(addressParts), [addressParts]);
  const displayAddress = useMemo(() => buildDisplayAddress(addressParts), [addressParts]);
  const serviceOptionById = useMemo(
    () => Object.fromEntries(serviceOptions.map((service) => [service.id, service])),
    [serviceOptions]
  );
  const serviceTitleById = useMemo(
    () =>
      Object.fromEntries(
        serviceOptions.map((service) => [service.id, formatServiceLabel(service)])
      ),
    [serviceOptions]
  );
  const selectedServiceLabel = useMemo(() => {
    if (selectedServiceIds.length === 0) return "Select one or more services";
    return resolveServiceTitles(selectedServiceIds, serviceTitleById).join(", ");
  }, [selectedServiceIds, serviceTitleById]);
  const selectedServices = useMemo(
    () =>
      selectedServiceIds.map((serviceId) => serviceOptionById[serviceId]).filter(Boolean),
    [selectedServiceIds, serviceOptionById]
  );
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

  function toggleService(serviceId) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((value) => value !== serviceId)
        : [...current, serviceId]
    );
  }

  function moveSelectedService(serviceId, direction) {
    setSelectedServiceIds((current) => {
      const currentIndex = current.indexOf(serviceId);
      if (currentIndex < 0) return current;

      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
      return moveItem(current, currentIndex, nextIndex);
    });
  }

  function removeSelectedService(serviceId) {
    setSelectedServiceIds((current) => current.filter((value) => value !== serviceId));
  }

  function updateOfficeHourRow(rowId, field, value) {
    setOfficeHourRows((current) =>
      current.map((row) =>
        row.id === rowId
          ? {
              ...row,
              [field]: value,
              ...(field === "closed" && value
                ? { startTime: "", endTime: "" }
                : field === "closed" && !value
                  ? {
                      startTime: row.startTime || "08:00",
                      endTime: row.endTime || "17:00",
                    }
                  : {}),
              label: "",
            }
          : row
      )
    );
  }

  function addOfficeHourRow(day) {
    setOfficeHourRows((current) =>
      sortOfficeHourRows([
        ...current,
        createOfficeHourRow({
          day,
          startTime: "08:00",
          endTime: "17:00",
        }),
      ])
    );
  }

  function removeOfficeHourRow(rowId) {
    setOfficeHourRows((current) => {
      const nextRows = current.filter((row) => row.id !== rowId);
      return nextRows.length > 0 ? nextRows : getInitialOfficeHourRows([]);
    });
  }

  async function handleLocationImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImageStatus("uploading");
    setImageMessage("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("kind", "location");

      const response = await fetch("/api/admin/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setImageStatus("error");
        setImageMessage(data.error || "Image upload failed.");
        return;
      }

      setMapImageUrl(data.url);
      setImageStatus("done");
      setImageMessage("Image uploaded.");
    } catch {
      setImageStatus("error");
      setImageMessage("Image upload failed.");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const hasIncompleteOfficeHour = officeHourRows.some(
      (row) => !row.label && hasOfficeHourInput(row) && !hasCompleteOfficeHourInput(row)
    );
    if (hasIncompleteOfficeHour) {
      setStatus("error");
      setMessage("Each office-hours row needs a day, start time, and end time.");
      return;
    }

    const hasInvalidOfficeHourRange = officeHours.some(
      (row) => !row.label && row.startTime >= row.endTime
    );
    if (hasInvalidOfficeHourRange) {
      setStatus("error");
      setMessage("Each office-hours row needs an end time after its start time.");
      return;
    }

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
          streetAddress,
          addressCity,
          addressState,
          postalCode,
          addressCountry,
          displayAddress,
          phone,
          directPhone,
          callTextPhone,
          hideOfficePhone,
          directionsUrl,
          bookingUrl,
          reviewUrl,
          mapImageUrl,
          mapImageAlt,
          officeHours,
          serviceIds: selectedServiceIds,
          services: [],
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
            disabled={status === "saving" || imageStatus === "uploading"}
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

                    <div className="builder-list-block">
                      <div className="builder-list-header">
                        <div>
                          <h4>Resources</h4>
                          <p>Book Appointment and Leave a Review are set per location. Patient Portal uses the shared site link.</p>
                        </div>
                      </div>

                      <div className="builder-grid-two">
                        <div className="builder-field">
                          <label>Book appointment URL</label>
                          <input
                            className="builder-input"
                            type="url"
                            value={bookingUrl}
                            onChange={(event) => setBookingUrl(event.target.value)}
                            placeholder="https://example.com/book"
                          />
                        </div>

                        <div className="builder-field">
                          <label>Leave a review URL</label>
                          <input
                            className="builder-input"
                            type="url"
                            value={reviewUrl}
                            onChange={(event) => setReviewUrl(event.target.value)}
                            placeholder="https://example.com/review"
                          />
                        </div>
                      </div>
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

                      <div className="builder-list-block">
                        <div className="builder-list-header">
                          <h4>Resources</h4>
                        </div>
                        <p>{bookingUrl || "Add the Book Appointment URL"}</p>
                        <p>Patient Portal uses the shared site link.</p>
                        <p>{reviewUrl || "Add the Leave a Review URL"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {activeStage === "contact" ? (
                <div className="location-editor-panel-grid builder-grid-two">
                  <div className="builder-element">
                    <div className="builder-section-heading contact-section-heading">
                      <div>
                        <h3>Contact & display</h3>
                        <p>Public-facing location details, phones, and office hours.</p>
                      </div>
                    </div>

                    <div className="builder-field">
                      <label>Street address</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={streetAddress}
                        onChange={(event) => setStreetAddress(event.target.value)}
                        placeholder="2775 Tapo St, Suite 102"
                        required
                      />
                    </div>

                    <div className="builder-grid-three">
                      <div className="builder-field">
                        <label>City</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={addressCity}
                          onChange={(event) => setAddressCity(event.target.value)}
                          placeholder="Simi Valley"
                        />
                      </div>

                      <div className="builder-field">
                        <label>State</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={addressState}
                          onChange={(event) => setAddressState(event.target.value)}
                          placeholder="CA"
                        />
                      </div>

                      <div className="builder-field">
                        <label>ZIP / Postal Code</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={postalCode}
                          onChange={(event) => setPostalCode(event.target.value)}
                          placeholder="93063"
                        />
                      </div>
                    </div>

                    <div className="builder-field">
                      <label>Region</label>
                      <input
                        className="builder-input"
                        type="text"
                        value={addressCountry}
                        onChange={(event) => setAddressCountry(event.target.value)}
                        placeholder="US"
                      />
                    </div>

                    <div className="builder-grid-three">
                      <div className="builder-field">
                        <label>Main phone</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={phone}
                          onChange={(event) => setPhone(event.target.value)}
                          placeholder="(888) 585-7373"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Direct phone</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={directPhone}
                          onChange={(event) => setDirectPhone(event.target.value)}
                          placeholder="(805) 329-5180"
                        />
                      </div>

                      <div className="builder-field">
                        <label>Call / text phone</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={callTextPhone}
                          onChange={(event) => setCallTextPhone(event.target.value)}
                          placeholder="888-585-7373"
                        />
                      </div>
                    </div>

                    <label className="builder-checkbox contact-hide-phone">
                      <input
                        type="checkbox"
                        checked={hideOfficePhone}
                        onChange={(event) => setHideOfficePhone(event.target.checked)}
                      />
                      Hide the office phone in the public phone card
                    </label>

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
                      <div className="builder-section-heading">
                        <div>
                          <label>Office hours</label>
                          <p>Set each day separately for the public card and JSON-LD schema.</p>
                        </div>
                      </div>

                      <div className="office-hours-builder">
                        {officeHourRows.map((row) =>
                          row.label && !hasOfficeHourInput(row) ? (
                            <div className="office-hour-legacy-row" key={row.id}>
                              <div>
                                <span>Legacy hours row</span>
                                <strong>{row.label}</strong>
                              </div>
                              <button
                                className="builder-button secondary danger"
                                type="button"
                                onClick={() => removeOfficeHourRow(row.id)}
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            <div className={`office-hour-row ${row.closed ? "is-closed" : ""}`} key={row.id}>
                              <div className="office-hour-day-cell">
                                <strong>{row.day || "Day"}</strong>
                                <label className="office-hour-closed-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={row.closed}
                                    onChange={(event) =>
                                      updateOfficeHourRow(row.id, "closed", event.target.checked)
                                    }
                                  />
                                  Closed
                                </label>
                              </div>

                              {!row.closed ? (
                                <>
                                  <div className="builder-field">
                                    <label>Opens at</label>
                                    <select
                                      className="builder-select"
                                      value={row.startTime}
                                      onChange={(event) =>
                                        updateOfficeHourRow(row.id, "startTime", event.target.value)
                                      }
                                    >
                                      <option value="">Select time</option>
                                      {OFFICE_HOUR_TIME_OPTIONS.map((time) => (
                                        <option key={`start-${row.id}-${time.value}`} value={time.value}>
                                          {time.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="builder-field">
                                    <label>Closes at</label>
                                    <select
                                      className="builder-select"
                                      value={row.endTime}
                                      onChange={(event) =>
                                        updateOfficeHourRow(row.id, "endTime", event.target.value)
                                      }
                                    >
                                      <option value="">Select time</option>
                                      {OFFICE_HOUR_TIME_OPTIONS.map((time) => (
                                        <option key={`end-${row.id}-${time.value}`} value={time.value}>
                                          {time.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <button
                                    className="builder-button secondary office-hour-add"
                                    type="button"
                                    aria-label={`Add another ${row.day} hours row`}
                                    onClick={() => addOfficeHourRow(row.day)}
                                  >
                                    +
                                  </button>
                                </>
                              ) : null}

                              {officeHourRows.filter((hours) => hours.day === row.day).length > 1 ? (
                                <button
                                  className="builder-button secondary danger office-hour-remove"
                                  type="button"
                                  onClick={() => removeOfficeHourRow(row.id)}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      <h2>Contact preview</h2>
                      <div className="location-preview-meta-grid">
                        <div className="location-preview-meta-item">
                          <span>Generated display address</span>
                          <strong className="contact-generated-address">
                            {displayAddress || address || "Add the office address"}
                          </strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Main phone</span>
                          <strong>{phone || "Add the main phone line"}</strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Direct phone</span>
                          <strong>{directPhone || "Add the direct line"}</strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Call / text phone</span>
                          <strong>{callTextPhone || "Add the call/text line"}</strong>
                        </div>
                      </div>
                      <div className="builder-list-block">
                        <div className="builder-list-header">
                          <h4>Office hours</h4>
                          <p>{officeHourPreviewRows.length} row(s)</p>
                        </div>
                        {officeHourPreviewRows.length === 0 ? (
                          <p className="builder-helper-text">Hours will appear here line by line.</p>
                        ) : (
                          officeHourPreviewRows.map((hours) => <p key={hours}>{hours}</p>)
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
                        <label>Location image</label>
                        <input
                          className="builder-input"
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleLocationImageUpload}
                        />
                        <p className="builder-helper-text">
                          Upload the image used for this location&apos;s media preview and public page.
                        </p>
                        {mapImageUrl ? (
                          <p className="builder-helper-text">Current image: {mapImageUrl}</p>
                        ) : null}
                        {imageMessage ? (
                          <p className={`status-message ${imageStatus === "error" ? "is-error" : ""}`}>
                            {imageMessage}
                          </p>
                        ) : null}
                      </div>

                      <div className="builder-field">
                        <label>Location image alt text</label>
                        <input
                          className="builder-input"
                          type="text"
                          value={mapImageAlt}
                          onChange={(event) => setMapImageAlt(event.target.value)}
                          placeholder="Bethesda location map"
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

                      <div className="location-preview-meta-grid">
                        <div className="location-preview-meta-item">
                          <span>Alt text</span>
                          <strong>{mapImageAlt || "Add descriptive alt text for this image."}</strong>
                        </div>
                        <div className="location-preview-meta-item">
                          <span>Upload status</span>
                          <strong>{mapImageUrl ? "Image ready for the public page" : "Upload a location image"}</strong>
                        </div>
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
                        <h3>Assign services</h3>
                        <p>Select existing shared services for this location page, then set their order here.</p>
                      </div>
                    </div>

                    {serviceOptions.length === 0 ? (
                      <div className="builder-list-block">
                        <p className="builder-helper-text">
                          No shared services exist yet. Create services in the Services tab first,
                          then return here to assign them to this location.
                        </p>
                      </div>
                    ) : (
                      <>
                        <details className="builder-multiselect">
                          <summary className="builder-multiselect-trigger">
                            <span>{selectedServiceLabel}</span>
                            <span>{selectedServiceIds.length} selected</span>
                          </summary>
                          <div className="builder-multiselect-menu">
                            {serviceOptions.map((service) => (
                              <label className="builder-option" key={service.id}>
                                <input
                                  type="checkbox"
                                  checked={selectedServiceIds.includes(service.id)}
                                  onChange={() => toggleService(service.id)}
                                />
                                <span>
                                  <strong>{service.title}</strong>
                                  <small>
                                    {service.category || "General Care"}
                                    {service.isActive ? "" : " - hidden"}
                                  </small>
                                </span>
                              </label>
                            ))}
                          </div>
                        </details>

                        {selectedServiceIds.length > 0 ? (
                          <div className="service-order-list">
                            {selectedServiceIds.map((serviceId, index) => {
                              const service = serviceOptionById[serviceId];
                              const isFirst = index === 0;
                              const isLast = index === selectedServiceIds.length - 1;

                              return (
                                <div className="service-order-card" key={serviceId}>
                                  <div className="service-order-copy">
                                    <strong>{service?.title || serviceTitleById[serviceId] || serviceId}</strong>
                                    <span>{service?.category || "General Care"}</span>
                                  </div>

                                  <div className="service-order-actions">
                                    <button
                                      className="builder-icon-button"
                                      type="button"
                                      aria-label={`Move ${service?.title || "service"} up`}
                                      onClick={() => moveSelectedService(serviceId, "up")}
                                      disabled={isFirst}
                                    >
                                      <ChevronUp />
                                    </button>
                                    <button
                                      className="builder-icon-button"
                                      type="button"
                                      aria-label={`Move ${service?.title || "service"} down`}
                                      onClick={() => moveSelectedService(serviceId, "down")}
                                      disabled={isLast}
                                    >
                                      <ChevronDown />
                                    </button>
                                    <button
                                      className="builder-icon-button danger"
                                      type="button"
                                      aria-label={`Remove ${service?.title || "service"} from this location`}
                                      onClick={() => removeSelectedService(serviceId)}
                                    >
                                      <X />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="builder-element location-preview-card">
                    <div className="location-preview-body">
                      <h2>Services preview</h2>
                      {selectedServices.length === 0 ? (
                        <p className="builder-helper-text">
                          Selected service cards will appear here and on the public services tab.
                        </p>
                      ) : (
                        <div className="builder-inline-group">
                          {selectedServices.map((service) => (
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
