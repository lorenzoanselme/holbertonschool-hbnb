import { getCurrentUserId, updateNavbar, logout } from "./auth.js";
import {
  apiCreatePlace,
  apiDeletePlace,
  apiGetAmenities,
  apiDeleteNotification,
  apiGetNotifications,
  apiGetPlaces,
  apiGetReviews,
  apiGetUser,
  apiMarkNotificationRead,
  apiUpdatePlace,
  apiUploadProfilePhoto,
  apiUpdateUser,
} from "./api.js";

let currentViewerId = null;
let currentProfileId = null;
let isOwnProfile = false;
let amenities = [];
let editingPlaceId = null;

document.addEventListener("DOMContentLoaded", async () => {
  updateNavbar();

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  currentViewerId = getCurrentUserId();
  currentProfileId = getRequestedProfileId();

  if (!currentProfileId) {
    window.location.href = "login.html";
    return;
  }

  isOwnProfile = currentViewerId === currentProfileId;
  configureProfileMode();
  bindEvents();

  if (isOwnProfile) {
    amenities = await apiGetAmenities().catch(() => []);
    renderAmenityChoices(amenities);
  }

  await Promise.all([
    loadProfile(currentProfileId),
    loadPlaces(currentProfileId),
    isOwnProfile ? loadNotifications() : Promise.resolve(),
    isOwnProfile ? loadMyReviews() : Promise.resolve(),
  ]);

  const params = new URLSearchParams(window.location.search);
  if (isOwnProfile && params.get("action") === "new-place") {
    openPlaceModal();
  }
});

function getRequestedProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || currentViewerId;
}

function configureProfileMode() {
  document.getElementById("profile-form-card").style.display = isOwnProfile
    ? "block"
    : "none";
  document.getElementById("places-section-title").textContent = isOwnProfile
    ? "Your places"
    : "Hosted places";
  document.getElementById("notifications-section").style.display = isOwnProfile
    ? "block"
    : "none";
  document.getElementById("my-reviews-section").style.display = isOwnProfile
    ? "block"
    : "none";
  const avatar = document.getElementById("profile-avatar");
  if (avatar) {
    avatar.classList.toggle("profile-avatar-editable", isOwnProfile);
    avatar.title = isOwnProfile ? "Click to change profile photo" : "";
  }
}

function bindEvents() {
  const profileForm = document.getElementById("profile-form");
  if (profileForm) profileForm.addEventListener("submit", handleProfileSubmit);

  const avatar = document.getElementById("profile-avatar");
  if (avatar) avatar.addEventListener("click", handleAvatarEdit);

  const photoInput = document.getElementById("profile-photo-input");
  if (photoInput) photoInput.addEventListener("change", handlePhotoSelected);

  const closeModalBtn = document.getElementById("close-place-modal");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closePlaceModal);

  const modal = document.getElementById("place-modal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closePlaceModal();
    });
  }

  const placeForm = document.getElementById("place-modal-form");
  if (placeForm) placeForm.addEventListener("submit", handlePlaceSubmit);

  const amenitiesToggle = document.getElementById("amenities-toggle");
  if (amenitiesToggle) {
    amenitiesToggle.addEventListener("click", toggleAmenitiesPanel);
  }
}

async function loadProfile(userId) {
  try {
    const user = await apiGetUser(userId);
    renderProfileSummary(user);
    if (isOwnProfile) fillProfileForm(user);
  } catch (err) {
    showAlert(
      "profile-alert",
      err.message || "Unable to load profile.",
      "error",
    );
    document.getElementById("profile-display-name").textContent =
      "Profile unavailable";
    document.getElementById("profile-public-bio").textContent =
      "This profile could not be loaded.";
  }
}

async function loadPlaces(userId) {
  const container = document.getElementById("profile-places");
  try {
    const places = await apiGetPlaces();
    const ownedPlaces = Array.isArray(places)
      ? places.filter((place) => place.owner_id === userId)
      : [];

    if (ownedPlaces.length === 0) {
      container.className = "";
      container.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">🏠</div>
          <h3>No places yet</h3>
          <p>${isOwnProfile ? 'Use the "Add Place" button to publish your first listing.' : "This host has not published any places yet."}</p>
        </div>
      `;
      return;
    }

    container.className = "places-list places-grid";
    container.innerHTML = ownedPlaces
      .map((place) => renderPlaceCard(place))
      .join("");

    container
      .querySelectorAll('[data-action="edit-place"]')
      .forEach((button) => {
        button.addEventListener("click", () => {
          const place = ownedPlaces.find(
            (item) => item.id === button.dataset.placeId,
          );
          if (place) openPlaceModal(place);
        });
      });

    container
      .querySelectorAll('[data-action="delete-place"]')
      .forEach((button) => {
        button.addEventListener("click", () =>
          handleDeletePlace(button.dataset.placeId),
        );
      });
  } catch (err) {
    container.className = "";
    container.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load places</h3>
        <p>${escapeHtml(err.message || "An unexpected error occurred.")}</p>
      </div>
    `;
  }
}

async function loadNotifications() {
  const container = document.getElementById("notifications-list");
  if (!container) return;

  try {
    const notifications = await apiGetNotifications();
    if (!Array.isArray(notifications) || notifications.length === 0) {
      container.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">🔔</div>
          <h3>No notifications</h3>
          <p>You will see new reviews for your places here.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = notifications
      .map(
        (notification) => `
          <article class="notification-card ${notification.is_read ? "is-read" : "is-unread"}">
            <div class="notification-copy">
              <p class="notification-message">${escapeHtml(notification.message)}</p>
              <p class="notification-date">${formatDate(notification.created_at)}</p>
            </div>
            <div class="notification-actions">
              <a href="place.html?id=${encodeURIComponent(notification.place_id)}" class="details-button">View place</a>
              ${
                notification.is_read
                  ? ""
                  : `<button type="button" class="login-button" data-action="mark-read" data-notification-id="${escapeHtml(notification.id)}">Mark as read</button>`
              }
              <button type="button" class="login-button" data-action="delete-notification" data-notification-id="${escapeHtml(notification.id)}">Delete</button>
            </div>
          </article>
        `,
      )
      .join("");

    container
      .querySelectorAll('[data-action="mark-read"]')
      .forEach((button) => {
        button.addEventListener("click", async () => {
          await apiMarkNotificationRead(button.dataset.notificationId);
          await loadNotifications();
        });
      });

    container
      .querySelectorAll('[data-action="delete-notification"]')
      .forEach((button) => {
        button.addEventListener("click", async () => {
          await apiDeleteNotification(button.dataset.notificationId);
          await loadNotifications();
        });
      });
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load notifications</h3>
        <p>${escapeHtml(err.message || "An unexpected error occurred.")}</p>
      </div>
    `;
  }
}

async function loadMyReviews() {
  const container = document.getElementById("my-reviews-list");
  if (!container) return;

  try {
    const [reviews, places] = await Promise.all([
      apiGetReviews(),
      apiGetPlaces(),
    ]);
    const myReviews = Array.isArray(reviews)
      ? reviews.filter((review) => review.user_id === currentProfileId)
      : [];

    if (myReviews.length === 0) {
      container.innerHTML = `
        <div class="empty-state fade-in">
          <div class="empty-state-icon">✍️</div>
          <h3>No reviews yet</h3>
          <p>Your posted reviews will appear here.</p>
        </div>
      `;
      return;
    }

    const placeMap = new Map(
      (Array.isArray(places) ? places : []).map((place) => [place.id, place]),
    );

    container.innerHTML = `
      <div class="profile-review-list">
        ${myReviews
          .map((review) =>
            renderMyReviewCard(review, placeMap.get(review.place_id)),
          )
          .join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="empty-state fade-in">
        <div class="empty-state-icon">⚠️</div>
        <h3>Could not load your reviews</h3>
        <p>${escapeHtml(err.message || "An unexpected error occurred.")}</p>
      </div>
    `;
  }
}

function renderProfileSummary(user) {
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Host";
  document.title = `${fullName} — HBnB`;
  document.getElementById("profile-display-name").textContent = fullName;
  document.getElementById("profile-public-bio").textContent =
    user.bio || "This host has not added a profile description yet.";
  renderAvatar(user);
}

function renderMyReviewCard(review, place = null) {
  const placeTitle = place?.title || "Unknown place";
  const stars =
    "★".repeat(Math.max(0, Math.min(5, review.rating || 0))) +
    "☆".repeat(Math.max(0, 5 - (review.rating || 0)));

  return `
    <article class="profile-review-card">
      <div class="profile-review-header">
        <div>
          <p class="profile-review-place-label">Place</p>
          <a href="place.html?id=${encodeURIComponent(review.place_id)}" class="profile-review-place-link">${escapeHtml(placeTitle)}</a>
        </div>
        <span class="profile-review-stars">${stars}</span>
      </div>
      <p class="profile-review-text">${escapeHtml(review.text || "")}</p>
    </article>
  `;
}

function fillProfileForm(user) {
  document.getElementById("first_name").value = user.first_name || "";
  document.getElementById("last_name").value = user.last_name || "";
  document.getElementById("email").value = user.email || "";
  document.getElementById("profile_picture_url").value =
    user.profile_picture_url || "";
  document.getElementById("bio").value = user.bio || "";
}

function handleAvatarEdit() {
  if (!isOwnProfile) return;
  const photoInput = document.getElementById("profile-photo-input");
  if (!photoInput) return;
  photoInput.click();
}

function handlePhotoSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showAlert("profile-alert", "Please select an image file.", "error");
    event.target.value = "";
    return;
  }

  if (file.size > 1_500_000) {
    showAlert(
      "profile-alert",
      "Image too large. Please choose a file smaller than 1.5 MB.",
      "error",
    );
    event.target.value = "";
    return;
  }

  uploadSelectedPhoto(file).finally(() => {
    event.target.value = "";
  });
}

async function uploadSelectedPhoto(file) {
  setLoading("profile", true);
  showAlert("profile-alert", "", "error");

  try {
    const result = await apiUploadProfilePhoto(currentProfileId, file);
    const photoUrl = result?.profile_picture_url || "";
    document.getElementById("profile_picture_url").value = photoUrl;
    renderAvatar({
      first_name: document.getElementById("first_name").value.trim(),
      last_name: document.getElementById("last_name").value.trim(),
      profile_picture_url: photoUrl,
    });
    showAlert("profile-alert", "Photo updated successfully.", "success");
  } catch (err) {
    showAlert(
      "profile-alert",
      err.message || "Could not upload photo.",
      "error",
    );
  } finally {
    setLoading("profile", false);
  }
}

async function handleProfileSubmit(event) {
  event.preventDefault();
  showAlert("profile-alert", "", "error");

  const payload = {
    first_name: document.getElementById("first_name").value.trim(),
    last_name: document.getElementById("last_name").value.trim(),
    profile_picture_url: document
      .getElementById("profile_picture_url")
      .value.trim(),
    bio: document.getElementById("bio").value.trim(),
  };

  if (!payload.first_name || !payload.last_name) {
    showAlert(
      "profile-alert",
      "First name and last name are required.",
      "error",
    );
    return;
  }

  setLoading("profile", true);
  try {
    const updated = await apiUpdateUser(currentProfileId, payload);
    renderProfileSummary(updated);
    showAlert("profile-alert", "Profile updated successfully.", "success");
  } catch (err) {
    showAlert(
      "profile-alert",
      err.message || "Unable to update profile.",
      "error",
    );
  } finally {
    setLoading("profile", false);
  }
}

function openPlaceModal(place = null) {
  if (!isOwnProfile) return;

  editingPlaceId = place?.id || null;
  document.getElementById("place-modal-title").textContent = editingPlaceId
    ? "Edit place"
    : "Add a place";
  document.getElementById("place-save-btn-text").textContent = editingPlaceId
    ? "Save changes"
    : "Create place";
  document.getElementById("place_title").value = place?.title || "";
  document.getElementById("place_description").value = place?.description || "";
  document.getElementById("place_price").value = place?.price ?? "";
  document.getElementById("place_latitude").value = place?.latitude ?? "";
  document.getElementById("place_longitude").value = place?.longitude ?? "";

  const selected = new Set(
    (place?.amenities || []).map((item) =>
      typeof item === "string" ? item : item.id,
    ),
  );
  document
    .querySelectorAll('#modal-amenities-list input[type="checkbox"]')
    .forEach((input) => {
      input.checked = selected.has(input.value);
    });
  updateAmenitySelectionSummary();
  setAmenitiesPanelOpen(false);

  showAlert("place-form-alert", "", "error");
  const modal = document.getElementById("place-modal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closePlaceModal() {
  document.getElementById("place-modal").hidden = true;
  document.body.classList.remove("modal-open");
  editingPlaceId = null;
  document.getElementById("place-modal-form").reset();
  document
    .querySelectorAll('#modal-amenities-list input[type="checkbox"]')
    .forEach((input) => {
      input.checked = false;
    });
  updateAmenitySelectionSummary();
  setAmenitiesPanelOpen(false);
  showAlert("place-form-alert", "", "error");
}

function renderAmenityChoices(items) {
  const container = document.getElementById("modal-amenities-list");
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    container.innerHTML =
      '<p style="color:var(--text-muted);font-size:0.875rem;">No amenities available.</p>';
    updateAmenitySelectionSummary();
    return;
  }

  container.innerHTML = items
    .map(
      (amenity) => `
    <label class="amenity-option">
      <input type="checkbox" value="${escapeHtml(amenity.id)}">
      <span class="amenity-option-label">${escapeHtml(amenity.name)}</span>
    </label>
  `,
    )
    .join("");

  container
    .querySelectorAll('input[type="checkbox"]')
    .forEach((input) =>
      input.addEventListener("change", updateAmenitySelectionSummary),
    );
  updateAmenitySelectionSummary();
}

function toggleAmenitiesPanel() {
  const panel = document.getElementById("modal-amenities-panel");
  if (!panel) return;
  setAmenitiesPanelOpen(panel.hidden);
}

function setAmenitiesPanelOpen(isOpen) {
  const panel = document.getElementById("modal-amenities-panel");
  const toggle = document.getElementById("amenities-toggle");
  if (!panel || !toggle) return;

  panel.hidden = !isOpen;
  toggle.setAttribute("aria-expanded", String(isOpen));
}

function updateAmenitySelectionSummary() {
  const summary = document.getElementById("amenities-selection-summary");
  const selected = Array.from(
    document.querySelectorAll("#modal-amenities-list input:checked"),
  ).map((input) => {
    const option = input.closest(".amenity-option");
    return option?.querySelector(".amenity-option-label")?.textContent?.trim();
  });

  if (!summary) return;

  const names = selected.filter(Boolean);
  if (names.length === 0) {
    summary.textContent = "No amenities selected.";
    return;
  }

  if (names.length <= 3) {
    summary.textContent = names.join(", ");
    return;
  }

  summary.textContent = `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

async function handlePlaceSubmit(event) {
  event.preventDefault();
  showAlert("place-form-alert", "", "error");

  const payload = {
    title: document.getElementById("place_title").value.trim(),
    description: document.getElementById("place_description").value.trim(),
    price: parseFloat(document.getElementById("place_price").value),
    latitude: parseFloat(document.getElementById("place_latitude").value),
    longitude: parseFloat(document.getElementById("place_longitude").value),
    amenities: Array.from(
      document.querySelectorAll("#modal-amenities-list input:checked"),
    ).map((input) => input.value),
  };

  if (
    !payload.title ||
    Number.isNaN(payload.price) ||
    Number.isNaN(payload.latitude) ||
    Number.isNaN(payload.longitude)
  ) {
    showAlert(
      "place-form-alert",
      "Please fill in all required fields.",
      "error",
    );
    return;
  }

  setLoading("place", true);
  const wasEditing = Boolean(editingPlaceId);

  try {
    if (wasEditing) {
      await apiUpdatePlace(editingPlaceId, payload);
    } else {
      await apiCreatePlace(payload);
    }
    closePlaceModal();
    await loadPlaces(currentProfileId);
    showAlert(
      "places-alert",
      wasEditing
        ? "Place updated successfully."
        : "Place created successfully.",
      "success",
    );
  } catch (err) {
    showAlert(
      "place-form-alert",
      err.message || "Unable to save place.",
      "error",
    );
  } finally {
    setLoading("place", false);
  }
}

async function handleDeletePlace(placeId) {
  if (!isOwnProfile) return;
  if (!window.confirm("Delete this place?")) return;

  try {
    await apiDeletePlace(placeId);
    showAlert("places-alert", "Place deleted successfully.", "success");
    await loadPlaces(currentProfileId);
  } catch (err) {
    showAlert(
      "places-alert",
      err.message || "Unable to delete place.",
      "error",
    );
  }
}

function renderPlaceCard(place) {
  const price =
    place.price != null
      ? `$${parseFloat(place.price).toFixed(0)} / night`
      : "N/A";
  const description = place.description
    ? `${place.description.slice(0, 120)}${place.description.length > 120 ? "…" : ""}`
    : "No description available.";

  return `
    <article class="place-card fade-in">
      <h3 class="place-card-title">${escapeHtml(place.title || "Untitled place")}</h3>
      <div class="place-card-meta">
        <span class="badge badge-price">${escapeHtml(price)}</span>
      </div>
      <p class="place-card-desc">${escapeHtml(description)}</p>
      <div class="profile-place-actions">
        <a href="place.html?id=${encodeURIComponent(place.id)}" class="details-button">View</a>
        ${
          isOwnProfile
            ? `
          <button type="button" class="login-button" data-action="edit-place" data-place-id="${escapeHtml(place.id)}">Edit</button>
          <button type="button" class="login-button profile-delete-btn" data-action="delete-place" data-place-id="${escapeHtml(place.id)}">Delete</button>
        `
            : ""
        }
      </div>
    </article>
  `;
}

function showAlert(elementId, message, type = "error") {
  const alert = document.getElementById(elementId);
  if (!alert) return;
  alert.className = message ? `alert alert-${type} show` : "alert";
  alert.textContent = message;
}

function setLoading(scope, loading) {
  if (scope === "profile") {
    const btn = document.getElementById("profile-btn");
    const text = document.getElementById("profile-btn-text");
    const spinner = document.getElementById("profile-spinner");
    if (btn) btn.disabled = loading;
    if (text) text.textContent = loading ? "Saving…" : "Save Profile";
    if (spinner) spinner.style.display = loading ? "inline-block" : "none";
    return;
  }

  const btn = document.getElementById("place-save-btn");
  const text = document.getElementById("place-save-btn-text");
  const spinner = document.getElementById("place-save-spinner");
  if (btn) btn.disabled = loading;
  if (text)
    text.textContent = loading
      ? "Saving…"
      : editingPlaceId
        ? "Save changes"
        : "Create place";
  if (spinner) spinner.style.display = loading ? "inline-block" : "none";
}

function getInitials(firstName, lastName) {
  return `${(firstName || "H").charAt(0)}${(lastName || "B").charAt(0)}`.toUpperCase();
}

function renderAvatar(user) {
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Host";
  document.getElementById("profile-avatar").innerHTML = user.profile_picture_url
    ? `<img src="${escapeHtml(user.profile_picture_url)}" alt="${escapeHtml(fullName)}">`
    : escapeHtml(getInitials(user.first_name, user.last_name));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}
