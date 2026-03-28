/**
 * places.js — Index page with price and distance filtering.
 */

import { requireAuth, updateNavbar, logout } from "./auth.js";
import { apiGetPlaces } from "./api.js";
import {
  formatDistanceKm,
  getCurrentPosition,
  haversineDistanceKm,
} from "./geo.js";

let allPlaces = [];
let userLocation = null;
let geoPermissionDenied = false;

document.addEventListener("DOMContentLoaded", () => {
  requireAuth();
  updateNavbar();

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  bindControls();
  loadPlaces();
});

function bindControls() {
  const priceFilter = document.getElementById("price-filter");
  const distanceFilter = document.getElementById("distance-filter");
  const nearbyOnly = document.getElementById("nearby-only");
  const locateBtn = document.getElementById("locate-user-btn");

  priceFilter?.addEventListener("change", renderCurrentResults);
  distanceFilter?.addEventListener("input", () => {
    updateDistanceValue();
    renderCurrentResults();
  });
  nearbyOnly?.addEventListener("change", renderCurrentResults);
  locateBtn?.addEventListener("click", handleLocateUser);

  updateDistanceValue();
}

async function loadPlaces() {
  const grid = document.getElementById("places-list");
  showSpinner(grid);

  try {
    const data = await apiGetPlaces();
    allPlaces = Array.isArray(data) ? data : [];

    if (allPlaces.length === 0) {
      showEmpty(grid);
      updateResultsSummary("No places available yet.");
      return;
    }

    renderCurrentResults();
  } catch (err) {
    console.error("[HBnB] Failed to load places:", err.message);
    showError(grid, err.message);
    updateResultsSummary("Unable to load places.");
  }
}

async function handleLocateUser() {
  const button = document.getElementById("locate-user-btn");
  const status = document.getElementById("location-status");

  if (button) button.disabled = true;
  if (status) status.textContent = "Locating you…";

  try {
    const position = await getCurrentPosition();
    userLocation = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    geoPermissionDenied = false;
    enableDistanceControls(true);
    if (status) {
      status.textContent =
        "Your location is active. Places are now sorted by distance.";
    }
    const subtitle = document.getElementById("places-subtitle");
    if (subtitle) {
      subtitle.textContent =
        "Nearby stays are prioritized first, then the rest of the catalog.";
    }
    renderCurrentResults();
  } catch (err) {
    geoPermissionDenied = true;
    if (status) {
      status.textContent =
        err?.code === 1
          ? "Location access was denied."
          : "Could not determine your position.";
    }
    renderCurrentResults();
  } finally {
    if (button) button.disabled = false;
  }
}

function enableDistanceControls(enabled) {
  const distanceFilter = document.getElementById("distance-filter");
  const nearbyOnly = document.getElementById("nearby-only");
  if (distanceFilter) distanceFilter.disabled = !enabled;
  if (nearbyOnly) nearbyOnly.disabled = !enabled;
}

function renderCurrentResults() {
  const grid = document.getElementById("places-list");
  const priceValue = document.getElementById("price-filter")?.value || "all";
  const maxDistanceKm = Number(
    document.getElementById("distance-filter")?.value || 75,
  );
  const nearbyOnly = Boolean(document.getElementById("nearby-only")?.checked);

  let filtered = allPlaces.map((place) => ({
    ...place,
    distanceKm: computePlaceDistance(place),
  }));

  if (priceValue !== "all") {
    const limit = parseFloat(priceValue);
    filtered = filtered.filter((place) => parseFloat(place.price) <= limit);
  }

  if (userLocation && nearbyOnly) {
    filtered = filtered.filter(
      (place) =>
        place.distanceKm != null && !Number.isNaN(place.distanceKm)
          ? place.distanceKm <= maxDistanceKm
          : false,
    );
  }

  filtered.sort((left, right) => sortPlaces(left, right, maxDistanceKm));

  if (filtered.length === 0) {
    showEmpty(
      grid,
      userLocation && nearbyOnly
        ? "No places match this price and distance range."
        : "No places match this filter.",
    );
    updateResultsSummary("0 stays match your current filters.");
    return;
  }

  renderPlaces(grid, filtered);
  updateResultsSummary(buildResultsSummary(filtered, maxDistanceKm, nearbyOnly));
}

function computePlaceDistance(place) {
  if (!userLocation) return null;
  if (place.latitude == null || place.longitude == null) return null;
  return haversineDistanceKm(userLocation, {
    latitude: Number(place.latitude),
    longitude: Number(place.longitude),
  });
}

function sortPlaces(left, right, maxDistanceKm) {
  const leftNearby =
    left.distanceKm != null && !Number.isNaN(left.distanceKm)
      ? left.distanceKm <= maxDistanceKm
      : false;
  const rightNearby =
    right.distanceKm != null && !Number.isNaN(right.distanceKm)
      ? right.distanceKm <= maxDistanceKm
      : false;

  if (userLocation && leftNearby !== rightNearby) {
    return leftNearby ? -1 : 1;
  }

  if (userLocation && left.distanceKm != null && right.distanceKm != null) {
    if (left.distanceKm !== right.distanceKm) {
      return left.distanceKm - right.distanceKm;
    }
  }

  return String(left.title || "").localeCompare(String(right.title || ""));
}

function buildResultsSummary(places, maxDistanceKm, nearbyOnly) {
  if (userLocation) {
    const nearbyCount = places.filter(
      (place) =>
        place.distanceKm != null && !Number.isNaN(place.distanceKm)
          ? place.distanceKm <= maxDistanceKm
          : false,
    ).length;
    if (nearbyOnly) {
      return `${places.length} stay(s) within ${maxDistanceKm} km of you.`;
    }
    return `${places.length} stay(s) shown. ${nearbyCount} within ${maxDistanceKm} km of you.`;
  }

  if (geoPermissionDenied) {
    return "Location was not shared. Showing the full catalog.";
  }

  return `${places.length} stay(s) available. Share your location to sort by proximity.`;
}

function updateDistanceValue() {
  const distanceFilter = document.getElementById("distance-filter");
  const distanceValue = document.getElementById("distance-value");
  if (!distanceFilter || !distanceValue) return;
  distanceValue.textContent = `${distanceFilter.value} km`;
}

function updateResultsSummary(message) {
  const summary = document.getElementById("places-results-summary");
  if (summary) summary.textContent = message;
}

function renderPlaces(grid, places) {
  grid.innerHTML = "";
  grid.className = "places-list places-grid places-grid-enhanced";

  places.forEach((place, index) => {
    const card = createPlaceCard(place);
    card.style.animationDelay = `${index * 50}ms`;
    if (index === 0) {
      card.classList.add("place-card-featured");
    }
    grid.appendChild(card);
  });
}

function createPlaceCard(place) {
  const href = `place.html?id=${encodeURIComponent(place.id)}`;
  const card = document.createElement("article");
  card.className = "place-card fade-in";
  card.style.cursor = "pointer";
  card.addEventListener("click", () => {
    window.location.href = href;
  });

  const title = place.title || place.name || "Unnamed Place";
  const price =
    place.price != null
      ? `$${parseFloat(place.price).toFixed(0)} / night`
      : "N/A";
  const desc = place.description
    ? place.description.substring(0, 110) +
      (place.description.length > 110 ? "…" : "")
    : "No description available.";
  const imageUrl = resolvePlaceImageUrl(getPrimaryPlaceImage(place));
  const distanceCopy =
    place.distanceKm != null ? formatDistanceKm(place.distanceKm) : null;

  card.innerHTML = `
    <div class="place-card-image-wrapper">
      <img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(title)}" class="place-card-image" onerror="this.onerror=null;this.src='${window.location.origin}/assets/demo-places/paris-studio.jpg';">
    </div>
    <div class="place-card-headline">
      <h2 class="place-card-title">${escapeHtml(title)}</h2>
      <div class="place-card-meta">
        <span class="badge badge-price">${escapeHtml(price)}</span>
        ${
          distanceCopy
            ? `<span class="badge badge-distance">${escapeHtml(distanceCopy)}</span>`
            : ""
        }
      </div>
    </div>
    <p class="place-card-desc">${escapeHtml(desc)}</p>
    <div class="place-card-footer">
      <a href="${href}" class="details-button">View Details</a>
    </div>
  `;

  return card;
}

function showSpinner(container) {
  container.className = "";
  container.innerHTML = `
    <div class="spinner-wrapper">
      <div class="spinner"></div>
    </div>
  `;
}

function showEmpty(container, message = "No places available yet.") {
  container.className = "";
  container.innerHTML = `
    <div class="empty-state fade-in">
      <div class="empty-state-icon">🏠</div>
      <h3>Nothing here</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showError(container, message) {
  container.className = "";
  container.innerHTML = `
    <div class="empty-state fade-in">
      <div class="empty-state-icon">⚠️</div>
      <h3>Failed to load places</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function resolvePlaceImageUrl(imageUrl) {
  const fallback = `${window.location.origin}/assets/demo-places/paris-studio.jpg`;

  if (!imageUrl) return fallback;
  if (/^https?:\/\//i.test(imageUrl)) return imageUrl;
  if (imageUrl.startsWith("assets/")) {
    return `${window.location.origin}/${imageUrl}`;
  }
  return imageUrl;
}

function getPrimaryPlaceImage(place) {
  if (Array.isArray(place?.image_urls) && place.image_urls.length > 0) {
    return place.image_urls[0];
  }
  return place?.image_url || "";
}
