/**
 * place.js — Place detail page.
 * Fetches place info, amenities, and reviews.
 * Shows the inline Add Review form only when authenticated.
 */

import { getCurrentUserId, updateNavbar, logout } from "./auth.js";
import { getCookie } from "./api.js";
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
  const token = getCookie("token");
  fetchPlaceDetails(token, currentPlaceId);
}

// ──────────────────────────────────────────────────
// Fetch place details
// ──────────────────────────────────────────────────

async function fetchPlaceDetails(token, placeId) {
  try {
    const place = await apiGetPlace(placeId, token);
    if (!place) return;

    currentIsOwner = getCurrentUserId() === place.owner_id;
    syncReviewSection(token, place.owner_id);

    const owner = await apiGetUser(place.owner_id, token).catch(() => null);
    displayPlaceDetails(place, owner);

    await loadReviews(placeId, place.reviews, token);
  } catch (err) {
    console.error("[HBnB] Failed to load place:", err.message);
    showPlaceError(err.message);
  }
}

function syncReviewSection(token, ownerId) {
  const section = document.getElementById("add-review");
  if (!section) return;

  if (!token) {
    section.style.display = "none";
    return;
  }

  const currentUserId = getCurrentUserId();
  if (currentUserId && currentUserId === ownerId) {
    section.style.display = "block";
    section.innerHTML = `
      <div class="detail-card add-review-card fade-in">
        <h2 class="section-title">Add a Review</h2>
        <p class="owner-review-note">You cannot review your own place.</p>
      </div>
    `;
    return;
  }

  section.style.display = "block";
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
  const price =
    place.price != null ? `$${parseFloat(place.price).toFixed(0)}` : "N/A";
  const lat =
    place.latitude != null ? parseFloat(place.latitude).toFixed(4) : null;
  const lon =
    place.longitude != null ? parseFloat(place.longitude).toFixed(4) : null;
  const amenities = place.amenities || [];
  const hostName = owner
    ? escapeHtml(`${owner.first_name} ${owner.last_name}`)
    : "Unknown";
  const ownerBio = owner?.bio
    ? escapeHtml(
        owner.bio.length > 160 ? `${owner.bio.slice(0, 160)}…` : owner.bio,
      )
    : "This host has not added a profile description yet.";
  const ownerAvatar = owner?.profile_picture_url
    ? `<img src="${escapeHtml(owner.profile_picture_url)}" alt="${hostName}">`
    : `<span>${escapeHtml(getInitials(owner?.first_name, owner?.last_name))}</span>`;
  const ownerLink = owner?.id
    ? `profile.html?id=${encodeURIComponent(owner.id)}`
    : null;

  section.innerHTML = `
    <div class="place-details fade-in">

      <div class="place-detail-main">

        <div class="place-info">
          <h1 class="detail-title">${escapeHtml(title)}</h1>
          <div class="detail-meta">
            <span class="badge badge-price">${escapeHtml(price)} / night</span>
            ${lat && lon ? `<span class="coordinates">${lat}, ${lon}</span>` : ""}
          </div>
          <div class="place-owner-card">
            ${ownerLink ? `<a href="${ownerLink}" class="place-owner-link">` : '<div class="place-owner-link">'}
              <div class="place-owner-avatar">${ownerAvatar}</div>
              <div class="place-owner-copy">
                <p class="place-owner-label">Hosted by</p>
                <p class="place-owner-name">${hostName}</p>
                <p class="place-owner-bio">${ownerBio}</p>
              </div>
            ${ownerLink ? "</a>" : "</div>"}
          </div>
          <p class="detail-description">${escapeHtml(desc)}</p>
          <div style="margin-top:20px;">
            <h2 class="section-title">Amenities</h2>
            ${renderAmenities(amenities)}
          </div>
        </div>

      </div>

      <div class="place-detail-sidebar">
        <div class="detail-card" style="text-align:center;">
          <p style="font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">Price per night</p>
          <div class="price-display">${escapeHtml(price)}<span> / night</span></div>
        </div>
        <a href="index.html" class="back-link">Back to places</a>
      </div>

    </div>
  `;
}

function renderAmenities(amenities) {
  if (!amenities || amenities.length === 0) {
    return '<p style="color:var(--text-muted);font-size:0.875rem;">No amenities listed.</p>';
  }
  const items = amenities
    .map((a) => {
      const name =
        typeof a === "string" ? a : a.name || a.title || JSON.stringify(a);
      return `<li class="amenity-tag">${escapeHtml(name)}</li>`;
    })
    .join("");
  return `<ul class="amenities-list">${items}</ul>`;
}

// ──────────────────────────────────────────────────
// Load reviews → #reviews
// ──────────────────────────────────────────────────

async function loadReviews(placeId, embeddedReviews, token) {
  const section = document.getElementById("reviews");
  if (!section) return;

  section.innerHTML = `
    <div class="detail-card fade-in">
      <h2 class="section-title">Reviews</h2>
      <ul class="reviews-list" id="reviews-list">
        <li class="spinner-wrapper"><div class="spinner"></div></li>
      </ul>
    </div>`;

  const list = document.getElementById("reviews-list");

  try {
    const hasFullObjects =
      Array.isArray(embeddedReviews) &&
      embeddedReviews.length > 0 &&
      typeof embeddedReviews[0] === "object";

    let reviews = hasFullObjects
      ? embeddedReviews
      : await apiGetPlaceReviews(placeId, token);

    if (!Array.isArray(reviews)) reviews = [];

    if (reviews.length === 0) {
      list.innerHTML = `<li style="color:var(--text-muted);font-size:0.875rem;padding:8px 0;">No reviews yet — be the first!</li>`;
      return;
    }

    const uniqueIds = [
      ...new Set(reviews.map((r) => r.user_id).filter(Boolean)),
    ];
    const userMap = {};
    await Promise.all(
      uniqueIds.map(async (uid) => {
        const user = await apiGetUser(uid, token).catch(() => null);
        if (user) userMap[uid] = `${user.first_name} ${user.last_name}`;
      }),
    );

    list.innerHTML = reviews.map((r) => renderReview(r, userMap)).join("");
    bindReviewResponseForms();
  } catch (err) {
    console.error("[HBnB] Failed to load reviews:", err.message);
    list.innerHTML = `<li style="color:var(--text-muted);font-size:0.875rem;">Could not load reviews: ${escapeHtml(err.message)}</li>`;
  }
}

function renderReview(review, userMap = {}) {
  const author =
    userMap[review.user_id] ||
    (review.user_id ? `User ${review.user_id.substring(0, 8)}…` : "Anonymous");
  const stars =
    "★".repeat(Math.max(0, Math.min(5, review.rating || 0))) +
    "☆".repeat(Math.max(0, 5 - (review.rating || 0)));
  const text = review.text || review.comment || "";
  const ownerResponse = review.owner_response
    ? `
      <div class="review-response">
        <p class="review-response-label">Host response</p>
        <p class="review-response-text">${escapeHtml(review.owner_response)}</p>
      </div>
    `
    : "";
  const responseForm = currentIsOwner
    ? `
      <form class="review-response-form" data-review-id="${escapeHtml(review.id)}">
        <textarea class="review-response-input" rows="3" placeholder="${review.owner_response ? "Update your response..." : "Write a reply to this review..."}"></textarea>
        <button type="submit" class="login-button">${review.owner_response ? "Update response" : "Save response"}</button>
      </form>
    `
    : "";

  return `
    <li class="review-card">
      <div class="review-header">
        <span class="review-author">${escapeHtml(author)}</span>
        <span class="review-stars">${stars}</span>
      </div>
      <p class="review-text">${escapeHtml(text)}</p>
      ${ownerResponse}
      ${responseForm}
    </li>`;
}

function bindReviewResponseForms() {
  if (!currentIsOwner) return;

  document.querySelectorAll(".review-response-form").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const reviewId = form.dataset.reviewId;
      const input = form.querySelector(".review-response-input");
      const responseText = (input?.value || "").trim();
      if (!responseText) return;

      try {
        await apiRespondToReview(reviewId, responseText);
        if (input) input.value = "";
        await loadReviews(currentPlaceId, [], getCookie("token"));
      } catch (err) {
        console.error("[HBnB] Failed to save review response:", err.message);
      }
    });
  });
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
    const token = getCookie("token");
    await loadReviews(currentPlaceId, [], token);
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
    section.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>${escapeHtml(message)}</p>
        <a href="index.html" class="back-link" style="margin-top:16px;">Back to places</a>
      </div>`;
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
  if (spinner) spinner.style.display = loading ? "inline-block" : "none";
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

function getInitials(firstName, lastName) {
  return `${(firstName || "H").charAt(0)}${(lastName || "B").charAt(0)}`.toUpperCase();
}
