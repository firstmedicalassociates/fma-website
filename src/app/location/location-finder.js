"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "../lib/config/site";
import { formatOfficeHourTime, normalizeOfficeHours } from "../lib/locations";
import styles from "./location-finder.module.css";

const DEFAULT_MAP_CENTER = { lat: 39.1141, lng: -76.8041 };
const DEFAULT_MAP_ZOOM = 7;
const FOCUSED_MAP_ZOOM = 11;
const MAP_BOUNDS_PADDING = 96;
const DEFAULT_SEARCH_RADIUS_MILES = 25;
const WEEKDAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const MAP_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#edf3fb" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5a78" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#edf3fb" }] },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c6d6ee" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#dbe7f7" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d7e8dc" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d8e2f1" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#c8d6f0" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#d3ddef" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c1daf5" }],
  },
];

let googleMapsLoaderPromise;

function waitForGoogleMapsReady(timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();

    function checkReady() {
      const maps = window.google?.maps;
      const isReady =
        typeof maps?.Map === "function" ||
        typeof maps?.importLibrary === "function";

      if (isReady) {
        resolve(window.google);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error("Google Maps loaded, but the Maps API did not finish initializing."));
        return;
      }

      window.setTimeout(checkReady, 50);
    }

    checkReady();
  });
}

function buildCallHref(value = "") {
  const normalized = String(value || "").replace(/[^\d+]/g, "");
  return normalized ? `tel:${normalized}` : "";
}

function isExternalUrl(value = "") {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function buildFinderSearchQuery({ state = "", city = "", zip = "" }) {
  return [city, state, zip]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function buildFinderSearchAttempts({ state = "", city = "", zip = "" }) {
  const stateValue = String(state || "").trim();
  const cityValue = String(city || "").trim();
  const zipValue = String(zip || "").trim();

  return [
    buildFinderSearchQuery({ state: stateValue, city: cityValue, zip: zipValue }),
    [cityValue, stateValue].filter(Boolean).join(", "),
    zipValue,
    cityValue,
    stateValue,
  ].filter((value, index, values) => value && values.indexOf(value) === index);
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMiles(origin, target) {
  if (!origin || !target) return null;

  const earthRadiusMiles = 3958.8;
  const latitudeDelta = toRadians(target.lat - origin.lat);
  const longitudeDelta = toRadians(target.lng - origin.lng);
  const originLatitude = toRadians(origin.lat);
  const targetLatitude = toRadians(target.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) * Math.cos(targetLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMiles * arc;
}

function formatDistanceMiles(value) {
  if (typeof value !== "number" || Number.isNaN(value)) return "";
  if (value < 10) return `${value.toFixed(1)} mi away`;
  return `${Math.round(value)} mi away`;
}

function getLocationStatus(officeHours = []) {
  const normalized = normalizeOfficeHours(officeHours);
  const today = WEEKDAY_LABELS[new Date().getDay()];
  const todayHours = normalized.find((entry) => entry.day === today);

  if (!todayHours) {
    return {
      label: "Hours unavailable",
      detail: "Check the location page for updates.",
      tone: "neutral",
    };
  }

  if (todayHours.closed) {
    return {
      label: "Closed today",
      detail: "Currently closed",
      tone: "closed",
    };
  }

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = String(todayHours.startTime || "00:00")
    .split(":")
    .map((value) => Number(value));
  const [closeHour, closeMinute] = String(todayHours.endTime || "00:00")
    .split(":")
    .map((value) => Number(value));
  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const opensAt = formatOfficeHourTime(todayHours.startTime);
  const closesAt = formatOfficeHourTime(todayHours.endTime);

  if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    return {
      label: `Open until ${closesAt}`,
      detail: `${opensAt} - ${closesAt}`,
      tone: "open",
    };
  }

  if (currentMinutes < openMinutes) {
    return {
      label: `Opens at ${opensAt}`,
      detail: `${opensAt} - ${closesAt}`,
      tone: "openingSoon",
    };
  }

  return {
    label: "Closed for today",
    detail: `${opensAt} - ${closesAt}`,
    tone: "closed",
  };
}

function getMarkerIcon(googleMaps, isSelected) {
  return {
    path: googleMaps.maps.SymbolPath.CIRCLE,
    fillColor: isSelected ? "#1b4ec9" : "#0f2358",
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: isSelected ? 4 : 3,
    scale: isSelected ? 10 : 8,
  };
}

function loadGoogleMaps(apiKey) {
  if (!apiKey) {
    return Promise.reject(new Error("Missing Google Maps API key."));
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return waitForGoogleMapsReady();
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise((resolve, reject) => {
      const existingScript = document.querySelector('script[data-google-maps-loader="true"]');

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => {
            waitForGoogleMapsReady().then(resolve).catch(reject);
          },
          { once: true }
        );
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google Maps.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
      script.async = true;
      script.defer = true;
      script.dataset.googleMapsLoader = "true";
      script.onload = () => {
        waitForGoogleMapsReady().then(resolve).catch(reject);
      };
      script.onerror = () => reject(new Error("Failed to load Google Maps."));
      document.head.appendChild(script);
    });
  }

  return googleMapsLoaderPromise;
}

async function ensureGoogleMapsLibraries(googleMaps) {
  const importLibrary = googleMaps?.maps?.importLibrary;

  if (typeof importLibrary === "function") {
    await importLibrary("maps");
    await importLibrary("geocoding");
  }

  if (typeof googleMaps?.maps?.Map !== "function") {
    throw new Error("Google Maps Map constructor is unavailable.");
  }
}

async function geocodeAddress(geocoder, attempts = []) {
  for (const address of attempts) {
    try {
      const response = await geocoder.geocode({ address });
      const result = response.results?.[0];

      if (result?.geometry?.location) {
        return {
          position: {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
          },
          label: result.formatted_address || address,
        };
      }
    } catch {
      continue;
    }
  }

  return null;
}

function ActionLink({ href, className, children, external = false }) {
  if (!href) {
    return <span className={`${className} ${styles.actionDisabled}`}>{children}</span>;
  }

  if (external || isExternalUrl(href)) {
    const shouldOpenInNewTab = isExternalUrl(href);

    return (
      <a
        className={className}
        href={href}
        target={shouldOpenInNewTab ? "_blank" : undefined}
        rel={shouldOpenInNewTab ? "noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}

export default function LocationFinder({ locations = [] }) {
  const [searchState, setSearchState] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [searchOrigin, setSearchOrigin] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchErrorMessage, setSearchErrorMessage] = useState("");
  const [pinnedSlug, setPinnedSlug] = useState(locations[0]?.slug || "");
  const [hasPinnedSelection, setHasPinnedSelection] = useState(false);
  const [mapStatus, setMapStatus] = useState(GOOGLE_MAPS_API_KEY ? "loading" : "missingKey");
  const [mapErrorMessage, setMapErrorMessage] = useState("");
  const [geocodeErrorMessage, setGeocodeErrorMessage] = useState("");
  const [geocodeVersion, setGeocodeVersion] = useState(0);

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef(new Map());
  const geocodeCacheRef = useRef(new Map());

  const rankedLocations = useMemo(() => {
    const baseLocations = locations.map((location) => {
      const position = geocodeCacheRef.current.get(location.slug);
      const distanceMiles = searchOrigin?.position
        ? calculateDistanceMiles(searchOrigin.position, position)
        : null;

      return {
        ...location,
        distanceMiles,
      };
    });

    if (!searchOrigin?.position) {
      return baseLocations;
    }

    return [...baseLocations].sort((left, right) => {
      const leftDistance =
        typeof left.distanceMiles === "number" ? left.distanceMiles : Number.POSITIVE_INFINITY;
      const rightDistance =
        typeof right.distanceMiles === "number" ? right.distanceMiles : Number.POSITIVE_INFINITY;

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }

      return left.title.localeCompare(right.title);
    });
  }, [geocodeVersion, locations, searchOrigin]);

  const filteredLocations = useMemo(() => {
    if (!searchOrigin?.position) {
      return rankedLocations;
    }

    return rankedLocations.filter(
      (location) =>
        typeof location.distanceMiles === "number" &&
        location.distanceMiles <= DEFAULT_SEARCH_RADIUS_MILES
    );
  }, [rankedLocations, searchOrigin]);

  const selectedLocation = useMemo(() => {
    if (!hasPinnedSelection || filteredLocations.length === 0) return null;

    return filteredLocations.find((location) => location.slug === pinnedSlug) || null;
  }, [filteredLocations, hasPinnedSelection, pinnedSlug]);

  const finderSearchQuery = useMemo(
    () => buildFinderSearchQuery({ state: searchState, city: searchCity, zip: searchZip }),
    [searchCity, searchState, searchZip]
  );
  const hasFinderSearchInput = Boolean(finderSearchQuery);
  const hasActiveFinderSearch = Boolean(searchOrigin?.position);
  const canRunFinderSearch = mapStatus === "ready" && !geocodeErrorMessage;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const previousAuthFailure = window.gm_authFailure;

    window.gm_authFailure = () => {
      setMapStatus("error");
      setMapErrorMessage(
        "Google rejected the API key or this website referrer. Check billing, enabled APIs, and allowed localhost/domain referrers."
      );

      if (typeof previousAuthFailure === "function") {
        previousAuthFailure();
      }
    };

    return () => {
      if (typeof previousAuthFailure === "function") {
        window.gm_authFailure = previousAuthFailure;
      } else {
        delete window.gm_authFailure;
      }
    };
  }, []);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapElementRef.current) return undefined;

    let cancelled = false;
    const markers = markersRef.current;

    async function initializeMap() {
      try {
        const googleMaps = await loadGoogleMaps(GOOGLE_MAPS_API_KEY);
        await ensureGoogleMapsLibraries(googleMaps);

        if (cancelled || !mapElementRef.current) return;

        mapRef.current = new googleMaps.maps.Map(mapElementRef.current, {
          center: DEFAULT_MAP_CENTER,
          zoom: DEFAULT_MAP_ZOOM,
          styles: GOOGLE_MAPS_MAP_ID ? undefined : MAP_STYLES,
          mapId: GOOGLE_MAPS_MAP_ID || undefined,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          rotateControl: false,
          clickableIcons: false,
          gestureHandling: "greedy",
          zoomControl: true,
        });
        setMapStatus("ready");
        setMapErrorMessage("");

        try {
          geocoderRef.current = new googleMaps.maps.Geocoder();
          setGeocodeErrorMessage("");
        } catch (error) {
          console.error("Google Maps geocoding failed to load.", error);
          setGeocodeErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Pins could not be geocoded. Check that geocoding is available for this key."
          );
        }
      } catch (error) {
        console.error("Google Maps failed to initialize.", error);
        if (!cancelled) {
          setMapStatus("error");
          setMapErrorMessage(
            error instanceof Error && error.message
              ? error.message
              : "Google Maps could not initialize. Check the browser console for the exact Maps API error."
          );
        }
      }
    }

    initializeMap();

    return () => {
      cancelled = true;
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
    };
  }, []);

  useEffect(() => {
    if (mapStatus !== "ready" || !geocoderRef.current) return undefined;

    let cancelled = false;

    async function geocodeLocations() {
      let changed = false;

      for (const location of locations) {
        if (geocodeCacheRef.current.has(location.slug)) continue;

        const attempts = [location.geocodeQuery, location.fallbackGeocodeQuery, location.title]
          .map((value) => String(value || "").trim())
          .filter(Boolean);

        for (const address of attempts) {
          try {
            const response = await geocoderRef.current.geocode({ address });
            const result = response.results?.[0];

            if (cancelled || !result?.geometry?.location) break;

            geocodeCacheRef.current.set(location.slug, {
              lat: result.geometry.location.lat(),
              lng: result.geometry.location.lng(),
            });
            changed = true;
            break;
          } catch {
            continue;
          }
        }
      }

      if (!cancelled && changed) {
        setGeocodeVersion((current) => current + 1);
      }
    }

    geocodeLocations();

    return () => {
      cancelled = true;
    };
  }, [locations, mapStatus]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || typeof window === "undefined") return;

    const googleMaps = window.google;
    const visibleLocationSlugs = new Set(filteredLocations.map((location) => location.slug));

    for (const location of locations) {
      const position = geocodeCacheRef.current.get(location.slug);
      if (!position) continue;

      let marker = markersRef.current.get(location.slug);
      if (!marker) {
        marker = new googleMaps.maps.Marker({
          position,
          map: visibleLocationSlugs.has(location.slug) ? mapRef.current : null,
          title: location.title,
          icon: getMarkerIcon(googleMaps, location.slug === selectedLocation?.slug),
        });
        marker.addListener("click", () => {
          setPinnedSlug(location.slug);
          setHasPinnedSelection(true);
        });
        markersRef.current.set(location.slug, marker);
      }

      marker.setPosition(position);
      marker.setTitle(location.title);
      marker.setIcon(getMarkerIcon(googleMaps, location.slug === selectedLocation?.slug));
      marker.setZIndex(location.slug === selectedLocation?.slug ? 100 : 10);
      marker.setMap(visibleLocationSlugs.has(location.slug) ? mapRef.current : null);
    }
  }, [filteredLocations, geocodeVersion, locations, mapStatus, selectedLocation]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || typeof window === "undefined") return;

    const positionsForBounds = hasActiveFinderSearch
      ? filteredLocations.slice(0, 6)
      : filteredLocations;
    const visiblePositions = positionsForBounds
      .map((location) => geocodeCacheRef.current.get(location.slug))
      .filter(Boolean);

    if (visiblePositions.length === 0) return;

    const googleMaps = window.google;
    const selectedPosition = selectedLocation
      ? geocodeCacheRef.current.get(selectedLocation.slug)
      : null;

    if (hasPinnedSelection && selectedPosition) {
      mapRef.current.panTo(selectedPosition);
      mapRef.current.setZoom(FOCUSED_MAP_ZOOM);
      return;
    }

    if (visiblePositions.length === 1) {
      mapRef.current.panTo(visiblePositions[0]);
      mapRef.current.setZoom(FOCUSED_MAP_ZOOM);
      return;
    }

    const bounds = new googleMaps.maps.LatLngBounds();
    visiblePositions.forEach((position) => bounds.extend(position));
    mapRef.current.fitBounds(bounds, MAP_BOUNDS_PADDING);
  }, [
    filteredLocations,
    geocodeVersion,
    hasActiveFinderSearch,
    hasPinnedSelection,
    mapStatus,
    selectedLocation,
  ]);

  async function handleFinderSearch(event) {
    event.preventDefault();

    if (!hasFinderSearchInput) {
      setSearchOrigin(null);
      setSearchStatus("idle");
      setSearchErrorMessage("");
      setHasPinnedSelection(false);
      setPinnedSlug("");
      return;
    }

    if (!canRunFinderSearch || !geocoderRef.current) {
      setSearchStatus("error");
      setSearchErrorMessage("Search becomes available once the map finishes loading.");
      return;
    }

    setSearchStatus("loading");
    setSearchErrorMessage("");

    const result = await geocodeAddress(
      geocoderRef.current,
      buildFinderSearchAttempts({ state: searchState, city: searchCity, zip: searchZip })
    );

    if (!result) {
      setSearchStatus("error");
      setSearchErrorMessage("Location not found. Try a city, state, or ZIP code.");
      return;
    }

    setSearchOrigin(result);
    setSearchStatus("success");
    setHasPinnedSelection(false);
    setPinnedSlug("");
  }

  function clearSearches() {
    setSearchState("");
    setSearchCity("");
    setSearchZip("");
    setSearchOrigin(null);
    setSearchStatus("idle");
    setSearchErrorMessage("");
    setHasPinnedSelection(false);
    setPinnedSlug("");
  }

  const selectedLocationStatus = selectedLocation ? getLocationStatus(selectedLocation.officeHours) : null;
  const selectedLocationCallHref = buildCallHref(selectedLocation?.publicPhone);
  const emptyResults = filteredLocations.length === 0;
  const resultsTagLabel = searchOrigin?.label || "";
  const showResultsPanel = hasActiveFinderSearch;
  const showDetailPanel = Boolean(selectedLocation);
  const stageContentClassName = `${styles.stageContent} ${
    showResultsPanel && showDetailPanel
      ? styles.stageContentBoth
      : showResultsPanel
        ? styles.stageContentResultsOnly
        : styles.stageContentDetailOnly
  }`;

  return (
    <div className={styles.shell}>
      <SiteHeader />
      <div className={styles.page}>
        <main className={styles.stage}>
          <div className={styles.mapBackdrop}>
            <div className={styles.mapCanvas} ref={mapElementRef} />
            <div className={styles.mapVeil} />

            <div className={styles.mapSearchDock}>
              <form className={styles.mapSearchForm} onSubmit={handleFinderSearch}>
                <label className={styles.mapSearchField}>
                  <span className={styles.mapSearchLabel}>City</span>
                  <input
                    type="text"
                    value={searchCity}
                    onChange={(event) => setSearchCity(event.target.value)}
                    placeholder="Search by city"
                  />
                </label>

                <div className={styles.mapSearchDivider} aria-hidden="true" />

                <label className={styles.mapSearchField}>
                  <span className={styles.mapSearchLabel}>State</span>
                  <input
                    type="text"
                    value={searchState}
                    onChange={(event) => setSearchState(event.target.value)}
                    placeholder="Search by state"
                  />
                </label>

                <div className={styles.mapSearchDivider} aria-hidden="true" />

                <label className={styles.mapSearchField}>
                  <span className={styles.mapSearchLabel}>Zip Code</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={searchZip}
                    onChange={(event) => setSearchZip(event.target.value)}
                    placeholder="Search by zip code"
                  />
                </label>

                <button
                  className={styles.mapSearchButton}
                  type="submit"
                  disabled={
                    searchStatus === "loading" ||
                    !canRunFinderSearch ||
                    (!hasFinderSearchInput && !hasActiveFinderSearch)
                  }
                  aria-label="Search locations"
                >
                  {searchStatus === "loading" ? (
                    <span className={styles.mapSearchButtonBusy}>...</span>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M5 12h12m-5-5 5 5-5 5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.4"
                      />
                    </svg>
                  )}
                </button>
              </form>

            </div>

            {mapStatus === "missingKey" ? (
              <div className={styles.mapFallback}>
                Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to `.env` and restart Next.
              </div>
            ) : null}

            {mapStatus === "error" ? (
              <div className={styles.mapFallback}>
                {mapErrorMessage || "Unable to load the live map right now."}
              </div>
            ) : null}

            {mapStatus === "ready" && geocodeErrorMessage ? (
              <div className={styles.mapNotice}>
                Map loaded, but location pins are unavailable: {geocodeErrorMessage}
              </div>
            ) : null}
          </div>

          {showResultsPanel || showDetailPanel ? (
            <div className={stageContentClassName}>
              {showResultsPanel ? (
                <aside className={`${styles.panel} ${styles.searchPanel}`}>
                  <div className={styles.resultsToolbar}>
                    <div
                      className={styles.resultsTag}
                      aria-label={`Showing locations within ${DEFAULT_SEARCH_RADIUS_MILES} miles of ${resultsTagLabel}`}
                    >
                      <span className={styles.resultsTagIcon} aria-hidden="true">
                        <svg viewBox="0 0 24 24">
                          <path
                            d="M12 21s-6-5.25-6-11a6 6 0 1 1 12 0c0 5.75-6 11-6 11Z"
                            fill="currentColor"
                          />
                          <circle cx="12" cy="10" r="2.6" fill="#ffffff" />
                        </svg>
                      </span>
                      <span className={styles.resultsTagText}>{resultsTagLabel}</span>
                    </div>
                    <button
                      className={styles.clearButton}
                      type="button"
                      onClick={clearSearches}
                    >
                      Clear
                    </button>
                  </div>

                  <div className={styles.locationList} role="list">
                    {emptyResults ? (
                      <div className={styles.emptyState}>
                        <strong>No locations match that search.</strong>
                        <span>Try a different city, state, or ZIP code.</span>
                      </div>
                    ) : (
                      filteredLocations.map((location) => {
                        const isActive = selectedLocation?.slug === location.slug;

                        return (
                          <button
                            key={location.slug}
                            className={`${styles.locationRow} ${isActive ? styles.locationRowActive : ""}`}
                            type="button"
                            onClick={() => {
                              setPinnedSlug(location.slug);
                              setHasPinnedSelection(true);
                            }}
                          >
                            <h3 className={styles.locationRowTitle}>{location.title}</h3>
                            <p>{location.addressLines[0] || location.address || "Address pending"}</p>
                            <div className={styles.locationRowMeta}>
                              <span>{location.addressLines.slice(1).join(", ") || location.title}</span>
                              <span>
                                {hasActiveFinderSearch && typeof location.distanceMiles === "number"
                                  ? formatDistanceMiles(location.distanceMiles)
                                  : `${location.providerCount} providers`}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </aside>
              ) : null}

              {showResultsPanel && showDetailPanel ? <div className={styles.centerSpacer} /> : null}
              {!showResultsPanel && showDetailPanel ? <div className={styles.centerSpacer} /> : null}

              {showDetailPanel ? (
                <aside className={`${styles.panel} ${styles.detailPanel}`}>
                <>
                <div className={styles.detailHero}>
                  {selectedLocation.mapImageUrl ? (
                    <img
                      className={styles.detailHeroImage}
                      src={selectedLocation.mapImageUrl}
                      alt={selectedLocation.mapImageAlt}
                    />
                  ) : (
                    <div className={styles.detailHeroPlaceholder}>
                      <span>{selectedLocation.title}</span>
                    </div>
                  )}
                </div>

                <div className={styles.detailBody}>
                  <div className={styles.detailHeader}>
                    <span className={styles.panelEyebrow}>Selected Location</span>
                    <h2>{selectedLocation.title}</h2>
                    <p>{selectedLocation.intro || selectedLocation.accent || "Location details and provider availability."}</p>
                  </div>

                  <div className={styles.detailMetaBlock}>
                    <strong>Address</strong>
                    <div className={styles.addressStack}>
                      {(selectedLocation.addressLines || []).map((line) => (
                        <span key={`${selectedLocation.slug}-${line}`}>{line}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.detailGrid}>
                    <div className={styles.detailStat}>
                      <span>Phone</span>
                      <strong>{selectedLocation.publicPhone || "Call for details"}</strong>
                    </div>
                    <div className={styles.detailStat}>
                      <span>Status</span>
                      <strong>{selectedLocationStatus?.label || "Hours unavailable"}</strong>
                    </div>
                  </div>

                  <div className={styles.actionGrid}>
                    <ActionLink className={styles.detailActionPrimary} href={selectedLocationCallHref} external>
                      Call clinic
                    </ActionLink>
                    <ActionLink className={styles.detailActionSecondary} href={selectedLocation.directionsUrl} external>
                      Directions
                    </ActionLink>
                    <ActionLink className={styles.detailActionSecondary} href={selectedLocation.slug}>
                      View location
                    </ActionLink>
                  </div>

                  <section className={styles.detailSection}>
                    <div className={styles.sectionHeading}>
                      <h3>Office hours</h3>
                      <span>{selectedLocationStatus?.detail || "Check the location page"}</span>
                    </div>
                    <div className={styles.hoursList}>
                      {selectedLocation.officeHourRows.length > 0 ? (
                        selectedLocation.officeHourRows.map((hours) => (
                          <div className={styles.hoursRow} key={`${selectedLocation.slug}-${hours}`}>
                            <span>{hours.split(":")[0]}</span>
                            <strong>{hours.split(": ").slice(1).join(": ")}</strong>
                          </div>
                        ))
                      ) : (
                        <p className={styles.emptyCopy}>Office hours will appear here once added in the CMS.</p>
                      )}
                    </div>
                  </section>

                  <section className={styles.detailSection}>
                    <div className={styles.sectionHeading}>
                      <h3>Providers</h3>
                      <Link href="/providers">View all</Link>
                    </div>
                    <div className={styles.providerList}>
                      {selectedLocation.providers.length > 0 ? (
                        selectedLocation.providers.map((provider) => (
                          <Link
                            key={provider.slug}
                            className={styles.providerRow}
                            href={`/providers/${provider.slug}`}
                          >
                            <img src={provider.imageUrl} alt={provider.imageAlt} />
                            <div>
                              <strong>{provider.name}</strong>
                              <span>{provider.title}</span>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <p className={styles.emptyCopy}>No active providers are assigned to this location yet.</p>
                      )}
                    </div>
                  </section>

                  <ActionLink
                    className={styles.bottomAction}
                    href={selectedLocation.bookingUrl || selectedLocation.slug}
                    external={Boolean(selectedLocation.bookingUrl)}
                  >
                    Book at this location
                  </ActionLink>
                </div>
                </>
                </aside>
              ) : null}
            </div>
          ) : null}
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}
