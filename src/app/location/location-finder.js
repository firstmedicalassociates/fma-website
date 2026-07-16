"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SiteFooter from "../components/site-footer";
import SiteHeader from "../components/site-header";
import { GOOGLE_MAPS_API_KEY, GOOGLE_MAPS_MAP_ID } from "../lib/config/site";
import { formatOfficeHourTime, normalizeOfficeHours } from "../lib/locations";
import {
  calculateDistanceMiles,
  findExactLocationGroups,
  flattenLocationGroups,
  groupLocationsByStructuredCity,
  LOCATION_SEARCH_RADIUS_MILES,
  selectLocationGroupsForSearch,
} from "./location-finder-utils.mjs";
import styles from "./location-finder.module.css";

const DEFAULT_MAP_CENTER = { lat: 39.1141, lng: -76.8041 };
const DEFAULT_MAP_ZOOM = 7;
const FOCUSED_MAP_ZOOM = 11;
const MAP_BOUNDS_PADDING = 96;
const MOBILE_BREAKPOINT_PX = 720;
const DEFAULT_MARKER_SIZE_PX = 18;
const SELECTED_MARKER_SIZE_PX = 22;
const FMA_MAP_MARKER_URL = "./uploads/FMAicon.svg";
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
  const markerSize = isSelected ? SELECTED_MARKER_SIZE_PX : DEFAULT_MARKER_SIZE_PX;

  return {
    url: FMA_MAP_MARKER_URL,
    scaledSize: new googleMaps.maps.Size(markerSize, markerSize),
    anchor: new googleMaps.maps.Point(markerSize / 2, markerSize / 2),
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
  const pathname = usePathname();
  const [searchState, setSearchState] = useState("");
  const [searchCity, setSearchCity] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [searchOrigin, setSearchOrigin] = useState(null);
  const [searchStatus, setSearchStatus] = useState("idle");
  const [searchErrorMessage, setSearchErrorMessage] = useState("");
  const [pinnedSlug, setPinnedSlug] = useState(locations[0]?.slug || "");
  const [focusedGroupKey, setFocusedGroupKey] = useState("");
  const [hasPinnedSelection, setHasPinnedSelection] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`).matches;
  });
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [mobileViewMode, setMobileViewMode] = useState("list");
  const [mapStatus, setMapStatus] = useState(GOOGLE_MAPS_API_KEY ? "loading" : "missingKey");
  const [mapErrorMessage, setMapErrorMessage] = useState("");
  const [geocodeErrorMessage, setGeocodeErrorMessage] = useState("");
  const [geocodePositions, setGeocodePositions] = useState(() => new Map());

  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const geocoderRef = useRef(null);
  const markersRef = useRef(new Map());
  const geocodeCacheRef = useRef(new Map());
  const mobileSheetTouchStartYRef = useRef(null);
  const mobileSheetScrollerRef = useRef(null);

  const rankedLocations = useMemo(() => {
    const baseLocations = locations.map((location) => {
      const position = geocodePositions.get(location.slug);
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
  }, [geocodePositions, locations, searchOrigin]);

  const allLocationGroups = useMemo(
    () => groupLocationsByStructuredCity(rankedLocations),
    [rankedLocations]
  );
  const locationSearchSelection = useMemo(() => {
    if (!searchOrigin?.position) {
      return {
        groups: allLocationGroups,
        usedExactMatch: false,
        usedNearestFallback: false,
        hasDistanceData: true,
      };
    }

    return selectLocationGroupsForSearch(allLocationGroups, {
      city: searchCity,
      state: searchState,
      zip: searchZip,
    });
  }, [allLocationGroups, searchCity, searchOrigin, searchState, searchZip]);
  const filteredLocationGroups = locationSearchSelection.groups;
  const filteredLocations = useMemo(
    () => flattenLocationGroups(filteredLocationGroups),
    [filteredLocationGroups]
  );

  const selectedLocation = useMemo(() => {
    if (!hasPinnedSelection || filteredLocations.length === 0) return null;

    return filteredLocations.find((location) => location.slug === pinnedSlug) || null;
  }, [filteredLocations, hasPinnedSelection, pinnedSlug]);
  const activeLocation = useMemo(() => {
    if (selectedLocation) return selectedLocation;
    if (isMobileViewport && mobileViewMode === "detail") return filteredLocations[0] || null;
    return null;
  }, [filteredLocations, isMobileViewport, mobileViewMode, selectedLocation]);
  const focusedLocationGroup = useMemo(
    () => filteredLocationGroups.find((group) => group.key === focusedGroupKey) || null,
    [filteredLocationGroups, focusedGroupKey]
  );

  const finderSearchQuery = useMemo(
    () => buildFinderSearchQuery({ state: searchState, city: searchCity, zip: searchZip }),
    [searchCity, searchState, searchZip]
  );
  const hasFinderSearchInput = Boolean(finderSearchQuery);
  const hasActiveFinderSearch = Boolean(searchOrigin?.position);
  const canRunFinderSearch = mapStatus === "ready" && !geocodeErrorMessage;

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT_PX}px)`);
    const syncMobileState = (event) => {
      setIsMobileViewport(event.matches);
      if (!event.matches) {
        setIsSheetExpanded(false);
        setMobileViewMode("list");
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncMobileState);
      return () => mediaQuery.removeEventListener("change", syncMobileState);
    }

    mediaQuery.addListener(syncMobileState);
    return () => mediaQuery.removeListener(syncMobileState);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !mobileSheetScrollerRef.current) return;
    mobileSheetScrollerRef.current.scrollTop = 0;
  }, [activeLocation?.slug, isMobileViewport, mobileViewMode]);

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
        setGeocodePositions(new Map(geocodeCacheRef.current));
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
      const position = geocodePositions.get(location.slug);
      if (!position) continue;

      let marker = markersRef.current.get(location.slug);
      if (!marker) {
        marker = new googleMaps.maps.Marker({
          position,
          map: visibleLocationSlugs.has(location.slug) ? mapRef.current : null,
          title: location.title,
          icon: getMarkerIcon(googleMaps, location.slug === activeLocation?.slug),
        });
        marker.addListener("click", () => {
          setPinnedSlug(location.slug);
          setFocusedGroupKey("");
          setHasPinnedSelection(true);
          if (isMobileViewport) {
            setMobileViewMode("detail");
          }
        });
        markersRef.current.set(location.slug, marker);
      }

      marker.setPosition(position);
      marker.setTitle(location.title);
      marker.setIcon(getMarkerIcon(googleMaps, location.slug === activeLocation?.slug));
      marker.setZIndex(location.slug === activeLocation?.slug ? 100 : 10);
      marker.setMap(visibleLocationSlugs.has(location.slug) ? mapRef.current : null);
    }
  }, [activeLocation?.slug, filteredLocations, geocodePositions, isMobileViewport, locations, mapStatus]);

  useEffect(() => {
    if (mapStatus !== "ready" || !mapRef.current || typeof window === "undefined") return;

    const positionsForBounds = hasActiveFinderSearch
      ? filteredLocations.slice(0, 6)
      : filteredLocations;
    const visiblePositions = positionsForBounds
      .map((location) => geocodePositions.get(location.slug))
      .filter(Boolean);

    if (visiblePositions.length === 0) return;

    const googleMaps = window.google;
    const selectedPosition = activeLocation
      ? geocodePositions.get(activeLocation.slug)
      : null;
    const focusedGroupPositions = (focusedLocationGroup?.locations || [])
      .map((location) => geocodePositions.get(location.slug))
      .filter(Boolean);

    if (hasPinnedSelection && selectedPosition) {
      mapRef.current.panTo(selectedPosition);
      mapRef.current.setZoom(FOCUSED_MAP_ZOOM);
      return;
    }

    if (focusedGroupPositions.length === 1) {
      mapRef.current.panTo(focusedGroupPositions[0]);
      mapRef.current.setZoom(FOCUSED_MAP_ZOOM);
      return;
    }

    if (focusedGroupPositions.length > 1) {
      const groupBounds = new googleMaps.maps.LatLngBounds();
      focusedGroupPositions.forEach((position) => groupBounds.extend(position));
      mapRef.current.fitBounds(groupBounds, MAP_BOUNDS_PADDING);
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
    geocodePositions,
    hasActiveFinderSearch,
    hasPinnedSelection,
    mapStatus,
    activeLocation,
    focusedLocationGroup,
  ]);

  async function handleFinderSearch(event) {
    event.preventDefault();

    if (!hasFinderSearchInput) {
      setSearchOrigin(null);
      setSearchStatus("idle");
      setSearchErrorMessage("");
      setHasPinnedSelection(false);
      setPinnedSlug("");
      setFocusedGroupKey("");
      return;
    }

    if (!canRunFinderSearch || !geocoderRef.current) {
      setSearchStatus("error");
      setSearchErrorMessage("Search becomes available once the map finishes loading.");
      return;
    }

    setSearchStatus("loading");
    setSearchErrorMessage("");

    const exactLocalGroups = findExactLocationGroups(allLocationGroups, {
      city: searchCity,
      state: searchState,
      zip: searchZip,
    });
    const localCityAttempts = exactLocalGroups
      .map((group) => [group.city, group.state].filter(Boolean).join(", "))
      .filter(Boolean);
    const result = await geocodeAddress(geocoderRef.current, [
      ...localCityAttempts,
      ...buildFinderSearchAttempts({ state: searchState, city: searchCity, zip: searchZip }),
    ]);

    if (!result) {
      setSearchStatus("error");
      setSearchErrorMessage("Location not found. Try a city, state, or ZIP code.");
      return;
    }

    setSearchOrigin(result);
    setSearchStatus("success");
    setHasPinnedSelection(false);
    setPinnedSlug("");
    setFocusedGroupKey("");
    setMobileViewMode("list");
  }

  function resetResolvedFinderSearch() {
    setSearchOrigin(null);
    setSearchStatus("idle");
    setSearchErrorMessage("");
    setHasPinnedSelection(false);
    setPinnedSlug("");
    setFocusedGroupKey("");
    setMobileViewMode("list");
  }

  function handleFinderInputChange(setValue, value) {
    setValue(value);
    resetResolvedFinderSearch();
  }

  function selectOffice(location, { showMobileDetail = false } = {}) {
    setPinnedSlug(location.slug);
    setFocusedGroupKey("");
    setHasPinnedSelection(true);
    if (showMobileDetail) setMobileViewMode("detail");
  }

  function focusLocationGroup(group) {
    setPinnedSlug("");
    setHasPinnedSelection(false);
    setFocusedGroupKey(group.key);
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
    setFocusedGroupKey("");
    setMobileViewMode("list");
    setIsSheetExpanded(false);
  }

  function handleSheetTouchStart(event) {
    mobileSheetTouchStartYRef.current = event.changedTouches?.[0]?.clientY ?? null;
  }

  function handleSheetTouchEnd(event) {
    const startY = mobileSheetTouchStartYRef.current;
    const endY = event.changedTouches?.[0]?.clientY ?? null;
    mobileSheetTouchStartYRef.current = null;
    if (startY === null || endY === null) return;

    const deltaY = endY - startY;
    if (Math.abs(deltaY) < 36) return;
    if (deltaY < 0) {
      setIsSheetExpanded(true);
      return;
    }
    setIsSheetExpanded(false);
  }

  const selectedLocationCallHref = buildCallHref(activeLocation?.publicPhone);
  const emptyResults = filteredLocationGroups.length === 0;
  const usedExactMatch =
    hasActiveFinderSearch && locationSearchSelection.usedExactMatch;
  const usedNearestFallback =
    hasActiveFinderSearch && locationSearchSelection.usedNearestFallback;
  const distanceDataUnavailable =
    hasActiveFinderSearch && !locationSearchSelection.hasDistanceData;
  const resultsTagLabel = hasActiveFinderSearch
    ? usedExactMatch
      ? `${filteredLocationGroups[0]?.title || searchCity} locations`
      : usedNearestFallback
      ? `Nearest locations to ${searchOrigin?.label || finderSearchQuery}`
      : searchOrigin?.label || finderSearchQuery
    : "All locations";
  const searchResultsSummary = usedExactMatch
    ? `${filteredLocations.length} office ${filteredLocations.length === 1 ? "location" : "locations"} in ${filteredLocationGroups[0]?.title || searchCity}.`
    : usedNearestFallback
      ? `No offices are within ${LOCATION_SEARCH_RADIUS_MILES} miles. Showing the nearest ${filteredLocationGroups.length} areas with FMA offices.`
      : hasActiveFinderSearch && !distanceDataUnavailable
        ? `Showing offices within ${LOCATION_SEARCH_RADIUS_MILES} miles.`
        : "";
  const mobileResultsHeading = usedExactMatch
    ? `${filteredLocationGroups[0]?.title || searchCity} Locations`
    : usedNearestFallback
      ? "Nearest Locations"
      : hasActiveFinderSearch
        ? `Within ${LOCATION_SEARCH_RADIUS_MILES} Miles`
        : "All Locations";
  const showResultsPanel = true;
  const showDesktopDetailView = !isMobileViewport && Boolean(activeLocation);
  const stageContentClassName = `${styles.stageContent} ${styles.stageContentResultsOnly}`;
  const mobileSheetClassName = `${styles.mobileSheet} ${
    isSheetExpanded ? styles.mobileSheetExpanded : styles.mobileSheetCollapsed
  } ${mobileViewMode === "detail" ? styles.mobileSheetDetail : styles.mobileSheetList}`;
  const showDesktopPanels = !isMobileViewport && showResultsPanel;
  const shouldShowFooter = pathname !== "/locations";
  const detailAddressPrimary = activeLocation?.addressLines?.[0] || activeLocation?.address || "Address pending";
  const detailAddressSecondary =
    activeLocation?.addressLines?.slice(1).join(", ") || "Address details";

  const renderLocationDetailCard = ({ onBack, backLabel }) => (
    <>
      <div className={styles.detailHero}>
        <ActionLink className={styles.detailHeroLink} href={activeLocation?.slug}>
          {activeLocation?.mapImageUrl ? (
            <img
              className={styles.detailHeroImage}
              src={activeLocation.mapImageUrl}
              alt={activeLocation.mapImageAlt}
            />
          ) : (
            <div className={styles.detailHeroPlaceholder}>
              <span>{activeLocation?.title}</span>
            </div>
          )}
        </ActionLink>
      </div>

      <div className={styles.detailBody}>
        <button type="button" className={styles.detailBackLink} onClick={onBack}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M14.5 6.5 9 12l5.5 5.5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.3"
            />
          </svg>
          <span>{backLabel}</span>
        </button>

        <div className={styles.detailHeader}>
          <h2>{activeLocation?.title}</h2>
          <p>{activeLocation?.intro || activeLocation?.accent || "Location details and provider availability."}</p>
        </div>

        <div className={styles.detailQuickActions}>
          <ActionLink className={styles.detailAddressCard} href={activeLocation?.slug}>
            <span className={styles.detailAddressIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s-6-5.25-6-11a6 6 0 1 1 12 0c0 5.75-6 11-6 11Z"
                  fill="currentColor"
                />
                <circle cx="12" cy="10" r="2.6" fill="#ffffff" />
              </svg>
            </span>
            <span className={styles.detailAddressCopy}>
              <strong>{detailAddressPrimary}</strong>
              <span>{detailAddressSecondary}</span>
            </span>
            <span className={styles.detailAddressChevron} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M9.5 6.5 15 12l-5.5 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                />
              </svg>
            </span>
          </ActionLink>

          <ActionLink className={styles.detailAddressCard} href={selectedLocationCallHref} external>
            <span className={styles.detailAddressIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M7.6 3.5h2.7l1.2 3.1-1.7 1.8a14.3 14.3 0 0 0 5.8 5.8l1.8-1.7 3.1 1.2v2.7a2 2 0 0 1-2 2C10.3 18.4 5.6 13.7 5.6 8.5a2 2 0 0 1 2-2Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            <span className={styles.detailAddressCopy}>
              <strong>{activeLocation?.publicPhone || "Call for details"}</strong>
              <span>Tap to call</span>
            </span>
            <span className={styles.detailAddressChevron} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M9.5 6.5 15 12l-5.5 5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.2"
                />
              </svg>
            </span>
          </ActionLink>

          <ActionLink className={`${styles.detailActionPrimary} ${styles.detailActionFull}`} href={activeLocation?.slug}>
            <span className={styles.detailActionIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 21s-6-5.25-6-11a6 6 0 1 1 12 0c0 5.75-6 11-6 11Z"
                  fill="currentColor"
                />
                <circle cx="12" cy="10" r="2.6" fill="#ffffff" />
              </svg>
            </span>
            View location
          </ActionLink>
        </div>
      </div>
    </>
  );

  return (
    <div className={styles.shell}>
      <SiteHeader />
      <div className={styles.page}>
        <main className={styles.stage}>
          <h1 className={styles.screenReaderOnly}>
            Find Primary Care and Same-Day Appointment Locations in Maryland
          </h1>
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
                    onChange={(event) =>
                      handleFinderInputChange(setSearchCity, event.target.value)
                    }
                    placeholder="Search by city"
                  />
                </label>

                <div className={styles.mapSearchDivider} aria-hidden="true" />

                <label className={styles.mapSearchField}>
                  <span className={styles.mapSearchLabel}>State</span>
                  <input
                    type="text"
                    value={searchState}
                    onChange={(event) =>
                      handleFinderInputChange(setSearchState, event.target.value)
                    }
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
                    onChange={(event) =>
                      handleFinderInputChange(setSearchZip, event.target.value)
                    }
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

          {isMobileViewport ? (
            <div className={styles.mobileOverlay}>
              <div className={styles.mobileSearchDock}>
                <form className={styles.mobileSearchForm} onSubmit={handleFinderSearch}>
                  <label className={styles.mobileSearchField}>
                    <span>Location</span>
                    <input
                      type="text"
                      value={searchCity}
                      onChange={(event) =>
                        handleFinderInputChange(setSearchCity, event.target.value)
                      }
                      placeholder="City"
                    />
                  </label>
                  <label className={styles.mobileSearchField}>
                    <span>Zip Code</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={searchZip}
                      onChange={(event) =>
                        handleFinderInputChange(setSearchZip, event.target.value)
                      }
                      placeholder="ZIP"
                    />
                  </label>
                  <button
                    className={styles.mobileSearchButton}
                    type="submit"
                    disabled={
                      searchStatus === "loading" ||
                      !canRunFinderSearch ||
                      (!hasFinderSearchInput && !hasActiveFinderSearch)
                    }
                    aria-label="Search locations"
                  >
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
                  </button>
                </form>
              </div>

              <section className={mobileSheetClassName}>
                <button
                  type="button"
                  className={styles.mobileSheetHandle}
                  onClick={() => setIsSheetExpanded((current) => !current)}
                  onTouchStart={handleSheetTouchStart}
                  onTouchEnd={handleSheetTouchEnd}
                  aria-label="Toggle location details"
                >
                  <span />
                </button>

                <div className={styles.mobileSheetScroller} ref={mobileSheetScrollerRef}>
                  {mobileViewMode === "list" ? (
                    <section className={styles.mobileLocationsSection}>
                      <div className={styles.mobileLocationsHeading}>
                        <h3>{mobileResultsHeading}</h3>
                        <button type="button" className={styles.clearButton} onClick={clearSearches}>
                          Clear
                        </button>
                      </div>

                      {searchErrorMessage || searchResultsSummary ? (
                        <p className={styles.mobileResultsSummary} role="status">
                          {searchErrorMessage || searchResultsSummary}
                        </p>
                      ) : null}

                      <div className={styles.mobileLocationList}>
                        {emptyResults ? (
                          <div className={styles.mobileEmptyState} role="status">
                            <strong>
                              {distanceDataUnavailable
                                ? "Nearby distances are temporarily unavailable."
                                : "No locations are available."}
                            </strong>
                            <span>
                              {distanceDataUnavailable
                                ? "Clear the search to view every office."
                                : "Please try again shortly."}
                            </span>
                          </div>
                        ) : (
                          filteredLocationGroups.map((group) => {
                            if (group.locations.length === 1) {
                              const location = group.locations[0];

                              return (
                                <button
                                  key={`mobile-${location.slug}`}
                                  type="button"
                                  className={`${styles.mobileLocationRow} ${
                                    activeLocation?.slug === location.slug
                                      ? styles.mobileLocationRowActive
                                      : ""
                                  }`}
                                  onClick={() =>
                                    selectOffice(location, { showMobileDetail: true })
                                  }
                                >
                                  <strong>{location.title}</strong>
                                  <span>
                                    {location.addressLines[0] ||
                                      location.address ||
                                      "Address pending"}
                                  </span>
                                  {hasActiveFinderSearch &&
                                  typeof location.distanceMiles === "number" ? (
                                    <span>{formatDistanceMiles(location.distanceMiles)}</span>
                                  ) : null}
                                </button>
                              );
                            }

                            const groupIsActive =
                              focusedGroupKey === group.key ||
                              group.locations.some(
                                (location) => activeLocation?.slug === location.slug
                              );

                            return (
                              <article
                                key={`mobile-${group.key}`}
                                className={`${styles.mobileLocationGroup} ${
                                  groupIsActive ? styles.mobileLocationGroupActive : ""
                                }`}
                              >
                                <button
                                  type="button"
                                  className={styles.mobileLocationGroupHeader}
                                  onClick={() => focusLocationGroup(group)}
                                  aria-label={`Show all ${group.locations.length} ${group.title} office pins`}
                                >
                                  <strong>{group.title}</strong>
                                  <span>{group.locations.length} offices · View pins</span>
                                </button>
                                <div className={styles.mobileLocationBranches}>
                                  {group.locations.map((location) => (
                                    <button
                                      key={`mobile-branch-${location.slug}`}
                                      type="button"
                                      className={`${styles.mobileLocationBranch} ${
                                        activeLocation?.slug === location.slug
                                          ? styles.mobileLocationRowActive
                                          : ""
                                      }`}
                                      onClick={() =>
                                        selectOffice(location, { showMobileDetail: true })
                                      }
                                    >
                                      <strong>{location.title}</strong>
                                      <span>
                                        {location.addressLines[0] ||
                                          location.address ||
                                          "Address pending"}
                                      </span>
                                      {hasActiveFinderSearch &&
                                      typeof location.distanceMiles === "number" ? (
                                        <span>{formatDistanceMiles(location.distanceMiles)}</span>
                                      ) : null}
                                    </button>
                                  ))}
                                </div>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>
                  ) : null}

                  {mobileViewMode === "detail" && activeLocation ? (
                    renderLocationDetailCard({
                      onBack: () => setMobileViewMode("list"),
                      backLabel: "Back to all locations",
                    })
                  ) : null}
                </div>

              </section>
            </div>
          ) : null}

          {showDesktopPanels ? (
            <div className={stageContentClassName}>
              <aside
                className={`${styles.panel} ${styles.searchPanel} ${
                  showDesktopDetailView ? styles.searchPanelDetailView : ""
                }`}
              >
                {showDesktopDetailView && activeLocation ? (
                  renderLocationDetailCard({
                    onBack: () => {
                      setHasPinnedSelection(false);
                      setPinnedSlug("");
                    },
                    backLabel: "Back to all locations",
                  })
                ) : (
                  <>
                    <div className={styles.resultsToolbar}>
                      <div
                        className={styles.resultsTag}
                        aria-label={
                          distanceDataUnavailable
                            ? "Nearby distances could not be calculated for this search"
                            : usedExactMatch
                              ? `Showing all ${filteredLocationGroups[0]?.title || searchCity} office locations`
                              : usedNearestFallback
                              ? `No offices are within ${LOCATION_SEARCH_RADIUS_MILES} miles. Showing the nearest ${filteredLocationGroups.length} areas with FMA offices.`
                              : hasActiveFinderSearch
                                ? `Showing locations within ${LOCATION_SEARCH_RADIUS_MILES} miles of ${resultsTagLabel}`
                                : `Showing ${resultsTagLabel}`
                        }
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
                      <button className={styles.clearButton} type="button" onClick={clearSearches}>
                        Clear
                      </button>
                    </div>

                    {searchErrorMessage || searchResultsSummary ? (
                      <p className={styles.resultsSummary} role="status">
                        {searchErrorMessage || searchResultsSummary}
                      </p>
                    ) : null}

                    <div className={styles.locationList}>
                      {emptyResults ? (
                        <div className={styles.emptyState}>
                          <strong>
                            {distanceDataUnavailable
                              ? "Nearby distances are temporarily unavailable."
                              : "No locations are available."}
                          </strong>
                          <span>
                            {distanceDataUnavailable
                              ? "Clear the search to view every office, then try again."
                              : "Please try again shortly."}
                          </span>
                        </div>
                      ) : (
                        filteredLocationGroups.map((group) => {
                          if (group.locations.length === 1) {
                            const location = group.locations[0];
                            const isActive = activeLocation?.slug === location.slug;

                            return (
                              <button
                                key={location.slug}
                                className={`${styles.locationRow} ${
                                  isActive ? styles.locationRowActive : ""
                                }`}
                                type="button"
                                onClick={() => selectOffice(location)}
                              >
                                <h3 className={styles.locationRowTitle}>{location.title}</h3>
                                <p>
                                  {location.addressLines[0] ||
                                    location.address ||
                                    "Address pending"}
                                </p>
                                <div className={styles.locationRowMeta}>
                                  <span>
                                    {location.addressLines.slice(1).join(", ") ||
                                      location.title}
                                  </span>
                                  <span>
                                    {hasActiveFinderSearch &&
                                    typeof location.distanceMiles === "number"
                                      ? formatDistanceMiles(location.distanceMiles)
                                      : `${location.providerCount} providers`}
                                  </span>
                                </div>
                              </button>
                            );
                          }

                          const groupIsActive =
                            focusedGroupKey === group.key ||
                            group.locations.some(
                              (location) => activeLocation?.slug === location.slug
                            );

                          return (
                            <article
                              key={group.key}
                              className={`${styles.locationGroup} ${
                                groupIsActive ? styles.locationGroupActive : ""
                              }`}
                            >
                              <button
                                type="button"
                                className={styles.locationGroupHeader}
                                onClick={() => focusLocationGroup(group)}
                                aria-label={`Show all ${group.locations.length} ${group.title} office pins`}
                              >
                                <span className={styles.locationGroupHeading}>
                                  <strong>{group.title}</strong>
                                  <span>{group.locations.length} office locations</span>
                                </span>
                                <span className={styles.locationGroupMapAction}>View pins</span>
                              </button>

                              <div className={styles.locationBranches}>
                                {group.locations.map((location) => {
                                  const isActive = activeLocation?.slug === location.slug;

                                  return (
                                    <button
                                      key={location.slug}
                                      className={`${styles.locationBranch} ${
                                        isActive ? styles.locationBranchActive : ""
                                      }`}
                                      type="button"
                                      onClick={() => selectOffice(location)}
                                    >
                                      <strong>{location.title}</strong>
                                      <p>
                                        {location.addressLines[0] ||
                                          location.address ||
                                          "Address pending"}
                                      </p>
                                      <div className={styles.locationRowMeta}>
                                        <span>
                                          {location.addressLines.slice(1).join(", ") ||
                                            location.title}
                                        </span>
                                        <span>
                                          {hasActiveFinderSearch &&
                                          typeof location.distanceMiles === "number"
                                            ? formatDistanceMiles(location.distanceMiles)
                                            : `${location.providerCount} providers`}
                                        </span>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </article>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </aside>
            </div>
          ) : null}
        </main>
      </div>
      {shouldShowFooter ? <SiteFooter /> : null}
    </div>
  );
}
