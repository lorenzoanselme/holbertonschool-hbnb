/**
 * place.js — Place detail page.
 * Fetches place info, amenities, and reviews.
 * Shows the inline Add Review form only when authenticated.
 */

import { getCurrentUserId, updateNavbar, logout } from "./auth.js";
import { reverseGeocode } from "./geo.js";
import {
  apiGetPlace,
  apiGetPlaceReviews,
  apiGetUser,
  apiCreateReview,
  apiRespondToReview,
} from "./api.js";

// ──────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────

let currentPlaceId = null;
let selectedRating = 0;
let currentIsOwner = false;
let currentPlaceMap = null;

// ──────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  updateNavbar();

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  currentPlaceId = getPlaceIdFromURL();

  if (!currentPlaceId) {
    showPlaceError("No place ID provided.");
    return;
  }

  checkAuthentication();
});

// ──────────────────────────────────────────────────
// Get place ID from URL
// ──────────────────────────────────────────────────

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

// ──────────────────────────────────────────────────
// Check authentication — show/hide add-review section
// ──────────────────────────────────────────────────

function checkAuthentication() {
  fetchPlaceDetails(currentPlaceId);
}

// ──────────────────────────────────────────────────
// Fetch place details
// ──────────────────────────────────────────────────

async function fetchPlaceDetails(placeId) {
  try {
    const place = await apiGetPlace(placeId);
    if (!place) return;

    currentIsOwner = getCurrentUserId() === place.owner_id;
    syncReviewSection(place.owner_id);

    const owner = await apiGetUser(place.owner_id).catch(() => null);
    displayPlaceDetails(place, owner);
    hydratePlaceLocation(place);

    await loadReviews(placeId, place.reviews);
  } catch (err) {
    console.error("[HBnB] Failed to load place:", err.message);
    showPlaceError(err.message);
  }
}

function syncReviewSection(ownerId) {
  const section = document.getElementById("add-review");
  if (!section) return;

  if (!getCurrentUserId()) {
    section.hidden = true;
    return;
  }

  const currentUserId = getCurrentUserId();
  if (currentUserId && currentUserId === ownerId) {
    section.hidden = false;
    const card = document.createElement("div");
    card.className = "detail-card add-review-card fade-in";
    const title = document.createElement("h2");
    title.className = "section-title";
    title.textContent = "Add a Review";
    const note = document.createElement("p");
    note.className = "owner-review-note";
    note.textContent = "You cannot review your own place.";
    card.appendChild(title);
    card.appendChild(note);
    section.replaceChildren(card);
    return;
  }

  section.hidden = false;
  const form = document.getElementById("review-form");
  if (!form?.dataset.bound) {
    initStarSelector();
    form.addEventListener("submit", handleReviewSubmit);
    form.dataset.bound = "true";
  }
}

// ──────────────────────────────────────────────────
// Display place details → #place-details
// ──────────────────────────────────────────────────

function displayPlaceDetails(place, owner) {
  const section = document.getElementById("place-details");
  if (!section) return;

  const title = place.title || place.name || "Unnamed Place";
  const desc = place.description || "No description available.";
  const imageUrls = getPlaceImageUrls(place);
  const image = renderPlaceGallery(imageUrls, title);
  const price =
    place.price != null ? `$${parseFloat(place.price).toFixed(0)}` : "N/A";
  const lat =
    place.latitude != null ? parseFloat(place.latitude).toFixed(4) : null;
  const lon =
    place.longitude != null ? parseFloat(place.longitude).toFixed(4) : null;
  const amenities = place.amenities || [];
  const hostName = owner ? `${owner.first_name} ${owner.last_name}` : "Unknown";
  const ownerBio = owner?.bio
    ? owner.bio.length > 160
      ? `${owner.bio.slice(0, 160)}…`
      : owner.bio
    : "This host has not added a profile description yet.";
  const ownerLink = owner?.id
    ? `profile.html?id=${encodeURIComponent(owner.id)}`
    : null;
  const root = document.createElement("div");
  root.className = "place-details fade-in";

  const main = document.createElement("div");
  main.className = "place-detail-main";

  const info = document.createElement("div");
  info.className = "place-info";
  info.appendChild(renderPlaceGallery(imageUrls, title));

  const heading = document.createElement("h1");
  heading.className = "detail-title";
  heading.textContent = title;

  const meta = document.createElement("div");
  meta.className = "detail-meta";

  const priceBadge = document.createElement("span");
  priceBadge.className = "badge badge-price";
  priceBadge.textContent = `${price} / night`;
  meta.appendChild(priceBadge);

  if (lat && lon) {
    const cityLabel = document.createElement("span");
    cityLabel.className = "coordinates";
    cityLabel.id = "place-city-label";
    cityLabel.textContent = "Looking up location…";

    const coordinates = document.createElement("span");
    coordinates.className = "coordinates";
    coordinates.textContent = `${lat}, ${lon}`;

    meta.appendChild(cityLabel);
    meta.appendChild(coordinates);
  }

  const ownerCard = document.createElement("div");
  ownerCard.className = "place-owner-card";

  const ownerWrapper = ownerLink
    ? document.createElement("a")
    : document.createElement("div");
  ownerWrapper.className = "place-owner-link";
  if (ownerLink) ownerWrapper.href = ownerLink;

  const ownerAvatar = document.createElement("div");
  ownerAvatar.className = "place-owner-avatar";
  if (owner?.profile_picture_url) {
    const imageNode = document.createElement("img");
    imageNode.src = owner.profile_picture_url;
    imageNode.alt = hostName;
    ownerAvatar.appendChild(imageNode);
  } else {
    const initials = document.createElement("span");
    initials.textContent = getInitials(owner?.first_name, owner?.last_name);
    ownerAvatar.appendChild(initials);
  }

  const ownerCopy = document.createElement("div");
  ownerCopy.className = "place-owner-copy";

  const ownerLabel = document.createElement("p");
  ownerLabel.className = "place-owner-label";
  ownerLabel.textContent = "Hosted by";

  const ownerName = document.createElement("p");
  ownerName.className = "place-owner-name";
  ownerName.textContent = hostName;

  const ownerBioEl = document.createElement("p");
  ownerBioEl.className = "place-owner-bio";
  ownerBioEl.textContent = ownerBio;

  ownerCopy.appendChild(ownerLabel);
  ownerCopy.appendChild(ownerName);
  ownerCopy.appendChild(ownerBioEl);
  ownerWrapper.appendChild(ownerAvatar);
  ownerWrapper.appendChild(ownerCopy);
  ownerCard.appendChild(ownerWrapper);

  const description = document.createElement("p");
  description.className = "detail-description";
  description.textContent = desc;

  info.appendChild(heading);
  info.appendChild(meta);
  info.appendChild(ownerCard);
  info.appendChild(description);

  if (lat && lon) {
    const mapCard = document.createElement("div");
    mapCard.className = "place-map-card";
    const mapHeader = document.createElement("div");
    mapHeader.className = "place-map-header";
    const mapHeaderCopy = document.createElement("div");
    const mapTitle = document.createElement("h2");
    mapTitle.className = "section-title";
    mapTitle.textContent = "Location";
    const mapCopy = document.createElement("p");
    mapCopy.className = "place-map-copy";
    mapCopy.textContent = "Explore where this stay is located on the map.";
    mapHeaderCopy.appendChild(mapTitle);
    mapHeaderCopy.appendChild(mapCopy);
    mapHeader.appendChild(mapHeaderCopy);
    const map = document.createElement("div");
    map.id = "place-map";
    map.className = "place-map";
    mapCard.appendChild(mapHeader);
    mapCard.appendChild(map);
    info.appendChild(mapCard);
  }

  const amenitiesBlock = document.createElement("div");
  amenitiesBlock.className = "place-amenities-block";
  const amenitiesTitle = document.createElement("h2");
  amenitiesTitle.className = "section-title";
  amenitiesTitle.textContent = "Amenities";
  amenitiesBlock.appendChild(amenitiesTitle);
  amenitiesBlock.appendChild(renderAmenities(amenities));
  info.appendChild(amenitiesBlock);

  main.appendChild(info);

  const sidebar = document.createElement("div");
  sidebar.className = "place-detail-sidebar";

  const detailCard = document.createElement("div");
  detailCard.className = "detail-card place-price-card";
  const sideLabel = document.createElement("p");
  sideLabel.className = "place-price-label";
  sideLabel.textContent = "Price per night";
  const priceDisplay = document.createElement("div");
  priceDisplay.className = "price-display";
  priceDisplay.append(document.createTextNode(price));
  const suffix = document.createElement("span");
  suffix.textContent = " / night";
  priceDisplay.appendChild(suffix);
  detailCard.appendChild(sideLabel);
  detailCard.appendChild(priceDisplay);

  const backLink = document.createElement("a");
  backLink.href = "index.html";
  backLink.className = "back-link";
  backLink.textContent = "Back to places";

  sidebar.appendChild(detailCard);
  sidebar.appendChild(backLink);

  root.appendChild(main);
  root.appendChild(sidebar);
  section.replaceChildren(root);
  section.dataset.imageUrls = JSON.stringify(imageUrls);

  bindPlaceGallery(section);
}

async function hydratePlaceLocation(place) {
  if (place.latitude == null || place.longitude == null) return;

  initPlaceMap(place.latitude, place.longitude, place.title || "Place");

  const label = document.getElementById("place-city-label");
  if (!label) return;

  try {
    const location = await reverseGeocode(
      Number(place.latitude),
      Number(place.longitude),
    );
    label.textContent = location.label;
  } catch {
    label.textContent = "Location unavailable";
  }
}

function initPlaceMap(latitude, longitude, title) {
  const mapElement = document.getElementById("place-map");
  if (!mapElement || typeof window.L === "undefined") return;

  if (currentPlaceMap) {
    currentPlaceMap.remove();
    currentPlaceMap = null;
  }

  currentPlaceMap = window.L.map(mapElement, {
    scrollWheelZoom: false,
  }).setView([latitude, longitude], 11);

  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(currentPlaceMap);

  window.L.marker([latitude, longitude])
    .addTo(currentPlaceMap)
    .bindPopup(escapeHtml(title || "Place"))
    .openPopup();

  setTimeout(() => currentPlaceMap?.invalidateSize(), 120);
}

function renderPlaceGallery(imageUrls, title) {
  const mainImage = resolvePlaceImageUrl(imageUrls[0]);
  const gallery = document.createElement("div");
  gallery.className = "place-gallery";

  const wrapper = document.createElement("div");
  wrapper.className = "place-hero-image-wrapper";

  if (imageUrls.length > 1) {
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "place-gallery-nav place-gallery-nav-prev";
    prev.setAttribute("aria-label", "Previous photo");
    prev.textContent = "‹";

    const next = document.createElement("button");
    next.type = "button";
    next.className = "place-gallery-nav place-gallery-nav-next";
    next.setAttribute("aria-label", "Next photo");
    next.textContent = "›";

    wrapper.appendChild(prev);
    wrapper.appendChild(next);
  }

  const image = document.createElement("img");
  image.src = mainImage;
  image.alt = title;
  image.className = "place-hero-image";
  image.id = "place-main-image";
  wrapper.appendChild(image);
  gallery.appendChild(wrapper);

  if (imageUrls.length > 1) {
    const toolbar = document.createElement("div");
    toolbar.className = "place-gallery-toolbar";

    const caption = document.createElement("p");
    caption.className = "place-gallery-caption";
    caption.textContent = "Browse the photos of this stay";

    const status = document.createElement("div");
    status.className = "place-gallery-status";
    const current = document.createElement("span");
    current.id = "place-gallery-index";
    current.textContent = "1";
    const total = document.createElement("span");
    total.textContent = String(imageUrls.length);
    status.appendChild(current);
    status.append(document.createTextNode("/"));
    status.appendChild(total);

    toolbar.appendChild(caption);
    toolbar.appendChild(status);
    gallery.appendChild(toolbar);
  }

  return gallery;
}

function bindPlaceGallery(section) {
  const mainImage = section.querySelector("#place-main-image");
  if (!mainImage) return;
  let parsedImageUrls = [];
  try {
    parsedImageUrls = JSON.parse(section.dataset.imageUrls || "[]");
  } catch {
    parsedImageUrls = [];
  }
  const imageUrls = getPlaceImageUrls({ image_urls: parsedImageUrls });
  if (imageUrls.length <= 1) return;

  const indexEl = section.querySelector("#place-gallery-index");
  const prevButton = section.querySelector(".place-gallery-nav-prev");
  const nextButton = section.querySelector(".place-gallery-nav-next");
  let currentIndex = 0;

  const updateImage = () => {
    mainImage.src = resolvePlaceImageUrl(imageUrls[currentIndex]);
    if (indexEl) indexEl.textContent = String(currentIndex + 1);
  };

  prevButton?.addEventListener("click", () => {
    currentIndex = (currentIndex - 1 + imageUrls.length) % imageUrls.length;
    updateImage();
  });

  nextButton?.addEventListener("click", () => {
    currentIndex = (currentIndex + 1) % imageUrls.length;
    updateImage();
  });
}

function renderAmenities(amenities) {
  if (!amenities || amenities.length === 0) {
    const empty = document.createElement("p");
    empty.className = "helper-text-muted";
    empty.textContent = "No amenities listed.";
    return empty;
  }
  const list = document.createElement("ul");
  list.className = "amenities-list";
  amenities.forEach((a) => {
    const item = document.createElement("li");
    item.className = "amenity-tag";
    item.textContent =
      typeof a === "string" ? a : a.name || a.title || JSON.stringify(a);
    list.appendChild(item);
  });
  return list;
}

// ──────────────────────────────────────────────────
// Load reviews → #reviews
// ──────────────────────────────────────────────────

async function loadReviews(placeId, embeddedReviews) {
  const section = document.getElementById("reviews");
  if (!section) return;
  const card = document.createElement("div");
  card.className = "detail-card fade-in";
  const title = document.createElement("h2");
  title.className = "section-title";
  title.textContent = "Reviews";
  const list = document.createElement("ul");
  list.id = "reviews-list";
  list.className = "reviews-list";
  const spinnerItem = document.createElement("li");
  spinnerItem.className = "spinner-wrapper";
  const spinner = document.createElement("div");
  spinner.className = "spinner";
  spinnerItem.appendChild(spinner);
  list.appendChild(spinnerItem);
  card.appendChild(title);
  card.appendChild(list);
  section.replaceChildren(card);

  try {
    const hasFullObjects =
      Array.isArray(embeddedReviews) &&
      embeddedReviews.length > 0 &&
      typeof embeddedReviews[0] === "object";

    let reviews = hasFullObjects
      ? embeddedReviews
      : await apiGetPlaceReviews(placeId);

    if (!Array.isArray(reviews)) reviews = [];

    if (reviews.length === 0) {
      const item = document.createElement("li");
      item.className = "helper-text-muted helper-text-block";
      item.textContent = "No reviews yet — be the first!";
      list.replaceChildren(item);
      return;
    }

    const uniqueIds = [
      ...new Set(reviews.map((r) => r.user_id).filter(Boolean)),
    ];
    const userMap = {};
    await Promise.all(
      uniqueIds.map(async (uid) => {
        const user = await apiGetUser(uid).catch(() => null);
        if (user) userMap[uid] = `${user.first_name} ${user.last_name}`;
      }),
    );

    list.replaceChildren(
      ...reviews.map((review) => createReviewElement(review, userMap)),
    );
  } catch (err) {
    console.error("[HBnB] Failed to load reviews:", err.message);
    const item = document.createElement("li");
    item.className = "helper-text-muted";
    item.textContent = `Could not load reviews: ${err.message}`;
    list.replaceChildren(item);
  }
}

function createReviewElement(review, userMap = {}) {
  const author =
    userMap[review.user_id] ||
    (review.user_id ? `User ${review.user_id.substring(0, 8)}…` : "Anonymous");
  const stars =
    "★".repeat(Math.max(0, Math.min(5, review.rating || 0))) +
    "☆".repeat(Math.max(0, 5 - (review.rating || 0)));
  const text = review.text || review.comment || "";
  const item = document.createElement("li");
  item.className = "review-card";

  const header = document.createElement("div");
  header.className = "review-header";

  const authorEl = document.createElement("span");
  authorEl.className = "review-author";
  authorEl.textContent = author;

  const starsEl = document.createElement("span");
  starsEl.className = "review-stars";
  starsEl.textContent = stars;

  header.appendChild(authorEl);
  header.appendChild(starsEl);

  const textEl = document.createElement("p");
  textEl.className = "review-text";
  textEl.textContent = text;

  item.appendChild(header);
  item.appendChild(textEl);

  if (review.owner_response) {
    const response = document.createElement("div");
    response.className = "review-response";

    const responseLabel = document.createElement("p");
    responseLabel.className = "review-response-label";
    responseLabel.textContent = "Host response";

    const responseText = document.createElement("p");
    responseText.className = "review-response-text";
    responseText.textContent = review.owner_response;

    response.appendChild(responseLabel);
    response.appendChild(responseText);
    item.appendChild(response);
  }

  if (currentIsOwner) {
    const form = document.createElement("form");
    form.className = "review-response-form";
    form.dataset.reviewId = review.id;

    const input = document.createElement("textarea");
    input.className = "review-response-input";
    input.rows = 3;
    input.placeholder = review.owner_response
      ? "Update your response..."
      : "Write a reply to this review...";

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "login-button";
    button.textContent = review.owner_response
      ? "Update response"
      : "Save response";

    form.appendChild(input);
    form.appendChild(button);
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reviewId = form.dataset.reviewId;
      const responseText = (input?.value || "").trim();
      if (!responseText) return;

      try {
        await apiRespondToReview(reviewId, responseText);
        if (input) input.value = "";
        await loadReviews(currentPlaceId, []);
      } catch (err) {
        console.error("[HBnB] Failed to save review response:", err.message);
      }
    });
    item.appendChild(form);
  }

  return item;
}

// ──────────────────────────────────────────────────
// Inline Add Review form
// ──────────────────────────────────────────────────

function initStarSelector() {
  const stars = document.querySelectorAll(".star-btn");
  stars.forEach((star) => {
    const value = parseInt(star.dataset.value);
    star.addEventListener("mouseenter", () => highlightStars(value));
    star.addEventListener("mouseleave", () => highlightStars(selectedRating));
    star.addEventListener("click", () => {
      selectedRating = value;
      const input = document.getElementById("rating-input");
      if (input) input.value = value;
      highlightStars(value);
    });
  });
}

function highlightStars(upTo) {
  document.querySelectorAll(".star-btn").forEach((star) => {
    star.classList.toggle("active", parseInt(star.dataset.value) <= upTo);
  });
}

async function handleReviewSubmit(e) {
  e.preventDefault();
  clearReviewAlert();

  const text = (document.getElementById("review-text").value || "").trim();
  const rating =
    parseInt(document.getElementById("rating-input").value) || selectedRating;

  if (!text) {
    showReviewAlert("Please write your review before submitting.", "error");
    return;
  }
  if (!rating || rating < 1 || rating > 5) {
    showReviewAlert("Please select a rating (1–5 stars).", "error");
    return;
  }

  setSubmitLoading(true);

  try {
    await apiCreateReview({ place_id: currentPlaceId, text, rating });
    showReviewAlert("Review submitted!", "success");

    // Reset form
    document.getElementById("review-form").reset();
    selectedRating = 0;
    highlightStars(0);
    const input = document.getElementById("rating-input");
    if (input) input.value = 0;

    // Reload reviews
    await loadReviews(currentPlaceId, []);
  } catch (err) {
    console.error("[HBnB] Review submission failed:", err.message);
    showReviewAlert(err.message || "Failed to submit review.", "error");
  } finally {
    setSubmitLoading(false);
  }
}

// ──────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────

function showPlaceError(message) {
  const section = document.getElementById("place-details");
  if (section) {
    const state = document.createElement("div");
    state.className = "empty-state fade-in";
    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.textContent = "⚠️";
    const title = document.createElement("h3");
    title.textContent = "Something went wrong";
    const text = document.createElement("p");
    text.textContent = message;
    const link = document.createElement("a");
    link.href = "index.html";
    link.className = "back-link empty-state-back-link";
    link.textContent = "Back to places";
    state.appendChild(icon);
    state.appendChild(title);
    state.appendChild(text);
    state.appendChild(link);
    section.replaceChildren(state);
  }
}

function showReviewAlert(message, type = "error") {
  const el = document.getElementById("review-alert");
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = message;
}

function clearReviewAlert() {
  const el = document.getElementById("review-alert");
  if (el) {
    el.className = "alert";
    el.textContent = "";
  }
}

function setSubmitLoading(loading) {
  const btn = document.getElementById("submit-btn");
  const btnText = document.getElementById("submit-btn-text");
  const spinner = document.getElementById("submit-spinner");
  if (btn) btn.disabled = loading;
  if (btnText) btnText.textContent = loading ? "Submitting…" : "Submit";
  if (spinner) spinner.hidden = !loading;
}

// ──────────────────────────────────────────────────
// XSS-safe escape
// ──────────────────────────────────────────────────

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

function getPlaceImageUrls(place) {
  const values = Array.isArray(place?.image_urls) ? place.image_urls : [];
  if (values.length > 0) return values;
  if (place?.image_url) return [place.image_url];
  return ["assets/demo-places/paris-studio.jpg"];
}

function getInitials(firstName, lastName) {
  return `${(firstName || "H").charAt(0)}${(lastName || "B").charAt(0)}`.toUpperCase();
}
