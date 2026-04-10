import { getCurrentUser, getCurrentUserId, updateNavbar, logout } from "./auth.js";
import { forwardGeocode, reverseGeocode } from "./geo.js";
import {
  apiCreatePlace,
  apiDeleteAllNotifications,
  apiDeletePlace,
  apiDeleteReview,
  apiBanUser,
  apiGetAmenities,
  apiDeleteNotification,
  apiGetNotifications,
  apiGetPlaces,
  apiGetReviews,
  apiGetUsers,
  apiMarkAllNotificationsRead,
  apiGetUser,
  apiMarkNotificationRead,
  apiUpdatePlace,
  apiUploadPlacePhoto,
  apiUploadProfilePhoto,
  apiUpdateUser,
} from "./api.js?v=20260328s";

let currentViewerId = null;
let currentProfileId = null;
let currentViewer = null;
let isOwnProfile = false;
let isAdminViewer = false;
let amenities = [];
let editingPlaceId = null;
let currentPlaceImageUrls = [];
let notificationsDeletePending = false;
let placesCollectionPromise = null;
let reviewsCollectionPromise = null;
let usersCollectionPromise = null;
let activeAdminTab = "users";
let confirmActionResolver = null;
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

document.addEventListener("DOMContentLoaded", async () => {
  updateNavbar();

  const logoutBtn = document.getElementById("nav-logout");
  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  currentViewer = getCurrentUser();
  currentViewerId = getCurrentUserId();
  currentProfileId = getRequestedProfileId();
  isAdminViewer = Boolean(currentViewer?.is_admin);

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
  if (isAdminViewer && params.get("admin") === "1") {
    await openAdminModal();
  }
  if (isOwnProfile && params.get("action") === "new-place") {
    openPlaceModal();
  }
});

function getRequestedProfileId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || currentViewerId;
}

function configureProfileMode() {
  document.getElementById("profile-form-card").hidden = !isOwnProfile;
  document.getElementById("places-section-title").textContent = isOwnProfile
    ? "Your places"
    : "Hosted places";
  document.getElementById("notifications-section").hidden = !isOwnProfile;
  document.getElementById("my-reviews-section").hidden = !isOwnProfile;
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

  const placePhotoTrigger = document.getElementById("place-photo-trigger");
  if (placePhotoTrigger) {
    placePhotoTrigger.addEventListener("click", handlePlacePhotoEdit);
  }

  const placePhotoInput = document.getElementById("place-photo-input");
  if (placePhotoInput) {
    placePhotoInput.addEventListener("change", handlePlacePhotoSelected);
  }

  const closeModalBtn = document.getElementById("close-place-modal");
  if (closeModalBtn) closeModalBtn.addEventListener("click", closePlaceModal);

  const readAllBtn = document.getElementById("notifications-read-all");
  if (readAllBtn) {
    readAllBtn.addEventListener("click", async () => {
      try {
        await apiMarkAllNotificationsRead();
        await loadNotifications();
      } catch (err) {
        showAlert(
          "profile-alert",
          err.message || "Could not mark all notifications as read.",
          "error",
        );
      }
    });
  }

  const deleteAllBtn = document.getElementById("notifications-delete-all");
  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", openNotificationsDeleteModal);
  }

  const notificationsDeleteCancel = document.getElementById(
    "notifications-delete-cancel",
  );
  if (notificationsDeleteCancel) {
    notificationsDeleteCancel.addEventListener(
      "click",
      closeNotificationsDeleteModal,
    );
  }

  const notificationsDeleteConfirm = document.getElementById(
    "notifications-delete-confirm",
  );
  if (notificationsDeleteConfirm) {
    notificationsDeleteConfirm.addEventListener(
      "click",
      handleConfirmDeleteAllNotifications,
    );
  }

  const notificationsDeleteModal = document.getElementById(
    "notifications-delete-modal",
  );
  if (notificationsDeleteModal) {
    notificationsDeleteModal.addEventListener("click", (event) => {
      if (event.target === notificationsDeleteModal) {
        closeNotificationsDeleteModal();
      }
    });
  }

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

  document.querySelectorAll(".admin-tab").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveAdminTab(button.dataset.adminTab || "users");
    });
  });

  const closeAdminModalBtn = document.getElementById("close-admin-modal");
  if (closeAdminModalBtn) {
    closeAdminModalBtn.addEventListener("click", closeAdminModal);
  }

  const adminModal = document.getElementById("admin-modal");
  if (adminModal) {
    adminModal.addEventListener("click", (event) => {
      if (event.target === adminModal) closeAdminModal();
    });
  }

  const profileBanButton = document.getElementById("profile-ban-user");
  if (profileBanButton) {
    profileBanButton.addEventListener("click", handleBanCurrentProfile);
  }

  const actionConfirmCancel = document.getElementById("action-confirm-cancel");
  if (actionConfirmCancel) {
    actionConfirmCancel.addEventListener("click", () => closeActionConfirm(false));
  }

  const actionConfirmSubmit = document.getElementById("action-confirm-submit");
  if (actionConfirmSubmit) {
    actionConfirmSubmit.addEventListener("click", () => closeActionConfirm(true));
  }

  const actionConfirmModal = document.getElementById("action-confirm-modal");
  if (actionConfirmModal) {
    actionConfirmModal.addEventListener("click", (event) => {
      if (event.target === actionConfirmModal) closeActionConfirm(false);
    });
  }
}

function confirmAction({
  title = "Are you sure?",
  message = "Please confirm this action.",
  confirmLabel = "Confirm",
  confirmClassName = "login-button profile-delete-btn",
  kicker = "Confirm action",
}) {
  const modal = document.getElementById("action-confirm-modal");
  const titleEl = document.getElementById("action-confirm-title");
  const copyEl = document.getElementById("action-confirm-copy");
  const submitEl = document.getElementById("action-confirm-submit");
  const kickerEl = document.getElementById("action-confirm-kicker");
  if (!modal || !titleEl || !copyEl || !submitEl || !kickerEl) {
    return Promise.resolve(false);
  }

  titleEl.textContent = title;
  copyEl.textContent = message;
  submitEl.textContent = confirmLabel;
  submitEl.className = confirmClassName;
  kickerEl.textContent = kicker;
  modal.hidden = false;
  document.body.classList.add("modal-open");

  return new Promise((resolve) => {
    confirmActionResolver = resolve;
  });
}

function closeActionConfirm(confirmed) {
  const modal = document.getElementById("action-confirm-modal");
  if (modal) {
    modal.hidden = true;
  }
  document.body.classList.remove("modal-open");
  if (confirmActionResolver) {
    const resolver = confirmActionResolver;
    confirmActionResolver = null;
    resolver(confirmed);
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
    const places = await getPlacesCollection();
    const ownedPlaces = Array.isArray(places)
      ? places.filter((place) => place.owner_id === userId)
      : [];

    if (ownedPlaces.length === 0) {
      container.className = "";
      renderEmptyState(
        container,
        "🏠",
        "No places yet",
        isOwnProfile
          ? 'Use the "Add Place" button to publish your first listing.'
          : "This host has not published any places yet.",
      );
      return;
    }

    container.className = "places-list places-grid";
    container.replaceChildren(
      ...ownedPlaces.map((place) => renderPlaceCard(place)),
    );

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

    container
      .querySelectorAll('[data-action="toggle-place-visibility"]')
      .forEach((button) => {
        button.addEventListener("click", () =>
          handleTogglePlaceVisibility(
            button.dataset.placeId,
            button.dataset.placeHidden === "true",
          ),
        );
      });
  } catch (err) {
    container.className = "";
    renderEmptyState(
      container,
      "⚠️",
      "Could not load places",
      err.message || "An unexpected error occurred.",
    );
  }
}

async function loadNotifications() {
  const container = document.getElementById("notifications-list");
  const readAllBtn = document.getElementById("notifications-read-all");
  const deleteAllBtn = document.getElementById("notifications-delete-all");
  if (!container) return;

  try {
    const notifications = await apiGetNotifications();
    const unreadCount = Array.isArray(notifications)
      ? notifications.filter((notification) => !notification.is_read).length
      : 0;
    if (readAllBtn) readAllBtn.hidden = unreadCount === 0;
    if (deleteAllBtn) {
      deleteAllBtn.hidden = !(
        Array.isArray(notifications) && notifications.length > 0
      );
    }
    if (!Array.isArray(notifications) || notifications.length === 0) {
      renderEmptyState(
        container,
        "🔔",
        "No notifications",
        "You will see new reviews for your places here.",
      );
      return;
    }

    container.replaceChildren(
      ...notifications.map((notification) =>
        createNotificationCard(notification),
      ),
    );
  } catch (err) {
    if (readAllBtn) readAllBtn.hidden = true;
    if (deleteAllBtn) deleteAllBtn.hidden = true;
    renderEmptyState(
      container,
      "⚠️",
      "Could not load notifications",
      err.message || "An unexpected error occurred.",
    );
  }
}

function createNotificationCard(notification) {
  const article = document.createElement("article");
  article.className = `notification-card ${notification.is_read ? "is-read" : "is-unread"}`;

  const copy = document.createElement("div");
  copy.className = "notification-copy";

  const message = document.createElement("p");
  message.className = "notification-message";
  message.textContent = notification.message || "Notification";

  const date = document.createElement("p");
  date.className = "notification-date";
  date.textContent = formatDate(notification.created_at);

  copy.appendChild(message);
  copy.appendChild(date);

  const actions = document.createElement("div");
  actions.className = "notification-actions";

  const placeLink = document.createElement("a");
  placeLink.href = `place.html?id=${encodeURIComponent(notification.place_id)}`;
  placeLink.className = "details-button";
  placeLink.textContent = "View place";
  actions.appendChild(placeLink);

  if (!notification.is_read) {
    const markReadButton = document.createElement("button");
    markReadButton.type = "button";
    markReadButton.className = "login-button";
    markReadButton.textContent = "Mark as read";
    markReadButton.addEventListener("click", async () => {
      await apiMarkNotificationRead(notification.id);
      await loadNotifications();
    });
    actions.appendChild(markReadButton);
  }

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "login-button";
  deleteButton.textContent = "Delete";
  deleteButton.addEventListener("click", async () => {
    await apiDeleteNotification(notification.id);
    await loadNotifications();
  });
  actions.appendChild(deleteButton);

  article.appendChild(copy);
  article.appendChild(actions);
  return article;
}

async function loadMyReviews() {
  const container = document.getElementById("my-reviews-list");
  if (!container) return;

  try {
    const [reviews, places] = await Promise.all([
      getReviewsCollection(),
      getPlacesCollection(),
    ]);
    const myReviews = Array.isArray(reviews)
      ? reviews.filter((review) => review.user_id === currentProfileId)
      : [];

    if (myReviews.length === 0) {
      renderEmptyState(
        container,
        "✍️",
        "No reviews yet",
        "Your posted reviews will appear here.",
      );
      return;
    }

    const placeMap = new Map(
      (Array.isArray(places) ? places : []).map((place) => [place.id, place]),
    );

    const list = document.createElement("div");
    list.className = "profile-review-list";
    myReviews.forEach((review) => {
      list.appendChild(
        renderMyReviewCard(review, placeMap.get(review.place_id)),
      );
    });
    container.replaceChildren(list);
  } catch (err) {
    renderEmptyState(
      container,
      "⚠️",
      "Could not load your reviews",
      err.message || "An unexpected error occurred.",
    );
  }
}

function getPlacesCollection(forceRefresh = false) {
  if (!forceRefresh && placesCollectionPromise) {
    return placesCollectionPromise;
  }

  placesCollectionPromise = apiGetPlaces({
    ownerScope: isOwnProfile,
  }).catch((error) => {
    placesCollectionPromise = null;
    throw error;
  });
  return placesCollectionPromise;
}

function getReviewsCollection(forceRefresh = false) {
  if (!forceRefresh && reviewsCollectionPromise) {
    return reviewsCollectionPromise;
  }

  reviewsCollectionPromise = apiGetReviews().catch((error) => {
    reviewsCollectionPromise = null;
    throw error;
  });
  return reviewsCollectionPromise;
}

function getUsersCollection(forceRefresh = false) {
  if (!forceRefresh && usersCollectionPromise) {
    return usersCollectionPromise;
  }

  usersCollectionPromise = apiGetUsers().catch((error) => {
    usersCollectionPromise = null;
    throw error;
  });
  return usersCollectionPromise;
}

async function loadAdminPanel() {
  if (!isAdminViewer) return;

  try {
    const [users, places, reviews] = await Promise.all([
      getUsersCollection(true),
      apiGetPlaces({ adminScope: true }),
      apiGetReviews({ adminScope: true }),
    ]);
    renderAdminUsers(Array.isArray(users) ? users : []);
    renderAdminPlaces(Array.isArray(places) ? places : [], users);
    renderAdminReviews(Array.isArray(reviews) ? reviews : [], users, places);
    setActiveAdminTab(activeAdminTab);
  } catch (err) {
    showAlert(
      "admin-alert",
      err.message || "Unable to load admin data.",
      "error",
    );
  }
}

function setActiveAdminTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll(".admin-tab").forEach((button) => {
    const isActive = button.dataset.adminTab === tab;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.adminPanel !== tab;
  });
}

function renderAdminUsers(users) {
  const container = document.getElementById("admin-users-list");
  if (!container) return;

  if (!users.length) {
    renderEmptyState(container, "👤", "No users", "No users were found.");
    return;
  }

  const sortedUsers = [...users].sort((a, b) =>
    `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`),
  );

  container.replaceChildren(
    ...sortedUsers.map((user) => {
      const article = document.createElement("article");
      article.className = "admin-record-card";

      const copy = document.createElement("div");
      copy.className = "admin-record-copy";

      const titleLink = document.createElement("a");
      titleLink.className = "admin-record-link";
      titleLink.href = `profile.html?id=${encodeURIComponent(user.id)}`;
      titleLink.textContent =
        `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email;

      const meta = document.createElement("p");
      meta.className = "admin-record-meta";
      meta.textContent = `${user.email}${user.is_admin ? " • Admin" : " • Member"}${user.is_banned ? " • Banned" : ""}`;

      copy.appendChild(titleLink);
      copy.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "admin-record-actions";

      if (user.id !== currentViewerId) {
        const toggleAdminButton = document.createElement("button");
        toggleAdminButton.type = "button";
        toggleAdminButton.className = "login-button";
        toggleAdminButton.textContent = user.is_admin
          ? "Remove admin"
          : "Make admin";
        toggleAdminButton.addEventListener("click", async () => {
          const confirmed = await confirmAction({
            kicker: "Admin panel",
            title: user.is_admin ? "Remove admin rights?" : "Grant admin rights?",
            message: user.is_admin
              ? `Remove admin rights from ${titleLink.textContent}?`
              : `Give admin rights to ${titleLink.textContent}?`,
            confirmLabel: user.is_admin ? "Remove admin" : "Make admin",
            confirmClassName: "login-button",
          });
          if (!confirmed) return;
          try {
            await apiUpdateUser(user.id, { is_admin: !user.is_admin });
            showAlert("admin-alert", "User updated successfully.", "success");
            await loadAdminPanel();
          } catch (err) {
            showAlert(
              "admin-alert",
              err.message || "Unable to update this user.",
              "error",
            );
          }
        });
        actions.appendChild(toggleAdminButton);

        const banButton = document.createElement("button");
        banButton.type = "button";
        banButton.className = "login-button profile-delete-btn";
        banButton.textContent = user.is_banned ? "Unban" : "Ban user";
        banButton.addEventListener("click", async () => {
          const actionLabel = user.is_banned ? "unban" : "ban";
          const confirmMessage = user.is_banned
            ? `Unban ${titleLink.textContent}? Their profile, places, and reviews will become visible again.`
            : `Ban ${titleLink.textContent}? Their access will be blocked and their profile, places, and reviews will be hidden from other users.`;
          const confirmed = await confirmAction({
            kicker: "Admin panel",
            title: user.is_banned ? "Unban this user?" : "Ban this user?",
            message: confirmMessage,
            confirmLabel: user.is_banned ? "Unban" : "Ban user",
          });
          if (!confirmed) return;
          try {
            usersCollectionPromise = null;
            if (user.is_banned) {
              await apiUpdateUser(user.id, { is_banned: false });
            } else {
              await apiBanUser(user.id);
            }
            showAlert(
              "admin-alert",
              `User ${actionLabel}ned successfully.`,
              "success",
            );
            await loadAdminPanel();
          } catch (err) {
            showAlert(
              "admin-alert",
              err.message || "Unable to ban this user.",
              "error",
            );
          }
        });
        actions.appendChild(banButton);
      }

      article.appendChild(copy);
      article.appendChild(actions);
      return article;
    }),
  );
}

async function openAdminModal() {
  if (!isAdminViewer) return;
  const modal = document.getElementById("admin-modal");
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  await loadAdminPanel();
}

function closeAdminModal() {
  const modal = document.getElementById("admin-modal");
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function handleBanCurrentProfile() {
  if (!isAdminViewer || isOwnProfile || !currentProfileId) return;

  try {
    const profileData = await apiGetUser(currentProfileId);
    const isCurrentlyBanned = Boolean(profileData?.is_banned);
    const confirmMessage = isCurrentlyBanned
      ? "Unban this user? Their profile, places, and reviews will be visible again."
      : "Ban this user? Their access will be blocked and their profile, places, and reviews will be hidden from others.";
    const confirmed = await confirmAction({
      kicker: "Profile moderation",
      title: isCurrentlyBanned ? "Unban this user?" : "Ban this user?",
      message: confirmMessage,
      confirmLabel: isCurrentlyBanned ? "Unban" : "Ban user",
    });
    if (!confirmed) return;

    if (isCurrentlyBanned) {
      await apiUpdateUser(currentProfileId, { is_banned: false });
      showAlert("profile-alert", "User unbanned successfully.", "success");
    } else {
      await apiBanUser(currentProfileId);
      showAlert("profile-alert", "User banned successfully.", "success");
    }
    await loadProfile(currentProfileId);
  } catch (err) {
    showAlert(
      "profile-alert",
      err.message || "Unable to ban this user.",
      "error",
    );
  }
}

function renderAdminPlaces(places, users = []) {
  const container = document.getElementById("admin-places-list");
  if (!container) return;

  if (!places.length) {
    renderEmptyState(container, "🏠", "No places", "No places were found.");
    return;
  }

  const sortedPlaces = [...places].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || ""),
  );
  const userMap = new Map((users || []).map((user) => [user.id, user]));

  container.replaceChildren(
    ...sortedPlaces.map((place) => {
      const article = document.createElement("article");
      article.className = "admin-record-card admin-place-card";

      const image = document.createElement("img");
      image.className = "admin-record-thumb";
      image.src = resolvePlaceImageUrl(getPrimaryPlaceImage(place));
      image.alt = place.title || "Place image";

      const copy = document.createElement("div");
      copy.className = "admin-record-copy";

      const title = document.createElement("h3");
      title.className = "admin-record-title";
      title.textContent = place.title || "Untitled place";

      const meta = document.createElement("p");
      meta.className = "admin-record-meta";
      const owner = userMap.get(place.owner_id);
      const ownerName = owner
        ? `${owner.first_name} ${owner.last_name}`.trim()
        : "Unknown owner";
      meta.textContent = `${formatAdminPrice(place.price)} • Hosted by ${ownerName}`;

      copy.appendChild(title);
      copy.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "admin-record-actions";

      const viewLink = document.createElement("a");
      viewLink.href = `place.html?id=${encodeURIComponent(place.id)}&admin=1`;
      viewLink.className = "details-button";
      viewLink.textContent = "View";
      actions.appendChild(viewLink);

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "login-button profile-delete-btn";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async () => {
        const confirmed = await confirmAction({
          kicker: "Admin panel",
          title: "Delete this place?",
          message: `Delete "${title.textContent}"?`,
          confirmLabel: "Delete",
        });
        if (!confirmed) return;
        try {
          await apiDeletePlace(place.id);
          placesCollectionPromise = null;
          reviewsCollectionPromise = null;
          showAlert("admin-alert", "Place deleted successfully.", "success");
          await Promise.all([loadAdminPanel(), loadPlaces(currentProfileId)]);
        } catch (err) {
          showAlert(
            "admin-alert",
            err.message || "Unable to delete this place.",
            "error",
          );
        }
      });
      actions.appendChild(deleteButton);

      article.appendChild(image);
      article.appendChild(copy);
      article.appendChild(actions);
      return article;
    }),
  );
}

function renderAdminReviews(reviews, users = [], places = []) {
  const container = document.getElementById("admin-reviews-list");
  if (!container) return;

  if (!reviews.length) {
    renderEmptyState(container, "✍️", "No reviews", "No reviews were found.");
    return;
  }

  const userMap = new Map((users || []).map((user) => [user.id, user]));
  const placeMap = new Map((places || []).map((place) => [place.id, place]));
  const sortedReviews = [...reviews].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || ""),
  );

  container.replaceChildren(
    ...sortedReviews.map((review) => {
      const article = document.createElement("article");
      article.className = "admin-record-card";
      article.addEventListener("click", () => {
        window.location.href = `place.html?id=${encodeURIComponent(review.place_id)}&admin=1#reviews`;
      });

      const copy = document.createElement("div");
      copy.className = "admin-record-copy";

      const author = userMap.get(review.user_id);
      const place = placeMap.get(review.place_id);

      const title = document.createElement("h3");
      title.className = "admin-record-title";
      title.textContent = `${author ? `${author.first_name} ${author.last_name}` : "Unknown user"} • ${"★".repeat(Math.max(0, Math.min(5, review.rating || 0)))}`;

      const meta = document.createElement("p");
      meta.className = "admin-record-meta";
      meta.textContent = `${place?.title || "Unknown place"} • ${truncateText(
        review.text || "",
        140,
      )}`;

      copy.appendChild(title);
      copy.appendChild(meta);

      const actions = document.createElement("div");
      actions.className = "admin-record-actions";

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "login-button profile-delete-btn";
      deleteButton.textContent = "Delete";
      deleteButton.addEventListener("click", async (event) => {
        event.stopPropagation();
        const confirmed = await confirmAction({
          kicker: "Admin panel",
          title: "Delete this review?",
          message: "This review will be removed permanently.",
          confirmLabel: "Delete",
        });
        if (!confirmed) return;
        try {
          await apiDeleteReview(review.id);
          reviewsCollectionPromise = null;
          showAlert("admin-alert", "Review deleted successfully.", "success");
          await Promise.all([loadAdminPanel(), loadMyReviews()]);
        } catch (err) {
          showAlert(
            "admin-alert",
            err.message || "Unable to delete this review.",
            "error",
          );
        }
      });
      actions.appendChild(deleteButton);

      article.appendChild(copy);
      article.appendChild(actions);
      return article;
    }),
  );
}

function renderProfileSummary(user) {
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Host";
  document.title = `${fullName} — HBnB`;
  document.getElementById("profile-display-name").textContent = fullName;
  document.getElementById("profile-public-bio").textContent =
    user.bio || "This host has not added a profile description yet.";
  const adminActions = document.getElementById("profile-admin-actions");
  const banButton = document.getElementById("profile-ban-user");
  if (adminActions && banButton) {
    const canBan = isAdminViewer && !isOwnProfile;
    adminActions.hidden = !canBan;
    banButton.disabled = false;
    banButton.textContent = user.is_banned ? "Unban user" : "Ban user";
  }
  renderAvatar(user);
}

function renderMyReviewCard(review, place = null) {
  const placeTitle = place?.title || "Unknown place";
  const stars =
    "★".repeat(Math.max(0, Math.min(5, review.rating || 0))) +
    "☆".repeat(Math.max(0, 5 - (review.rating || 0)));
  const article = document.createElement("article");
  article.className = "profile-review-card";

  const header = document.createElement("div");
  header.className = "profile-review-header";

  const left = document.createElement("div");

  const label = document.createElement("p");
  label.className = "profile-review-place-label";
  label.textContent = "Place";

  const link = document.createElement("a");
  link.href = `place.html?id=${encodeURIComponent(review.place_id)}`;
  link.className = "profile-review-place-link";
  link.textContent = placeTitle;

  const starsEl = document.createElement("span");
  starsEl.className = "profile-review-stars";
  starsEl.textContent = stars;

  const text = document.createElement("p");
  text.className = "profile-review-text";
  text.textContent = review.text || "";

  left.appendChild(label);
  left.appendChild(link);
  header.appendChild(left);
  header.appendChild(starsEl);
  article.appendChild(header);
  article.appendChild(text);
  return article;
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

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    showAlert(
      "profile-alert",
      "Image too large. Please choose a file smaller than 5 MB.",
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
  currentPlaceImageUrls = Array.isArray(place?.image_urls)
    ? [...place.image_urls]
    : place?.image_url
      ? [place.image_url]
      : [];
  syncPlaceImageFields();
  renderPlacePhotoPreview(currentPlaceImageUrls, place?.title || "");
  document.getElementById("place_price").value = place?.price ?? "";
  document.getElementById("place_latitude").value = place?.latitude ?? "";
  document.getElementById("place_longitude").value = place?.longitude ?? "";
  const placeCityInput = document.getElementById("place_city");
  if (placeCityInput) {
    placeCityInput.value = "";
  }
  if (place?.latitude != null && place?.longitude != null && placeCityInput) {
    reverseGeocode(Number(place.latitude), Number(place.longitude))
      .then((location) => {
        placeCityInput.value = location.label || "";
      })
      .catch(() => {
        placeCityInput.value = "";
      });
  }

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
  currentPlaceImageUrls = [];
  syncPlaceImageFields();
  renderPlacePhotoPreview([], "");
  const placePhotoInput = document.getElementById("place-photo-input");
  if (placePhotoInput) placePhotoInput.value = "";
  document
    .querySelectorAll('#modal-amenities-list input[type="checkbox"]')
    .forEach((input) => {
      input.checked = false;
    });
  updateAmenitySelectionSummary();
  setAmenitiesPanelOpen(false);
  showAlert("place-form-alert", "", "error");
}

function openNotificationsDeleteModal() {
  const modal = document.getElementById("notifications-delete-modal");
  if (!modal) return;
  notificationsDeletePending = true;
  modal.hidden = false;
}

function closeNotificationsDeleteModal() {
  const modal = document.getElementById("notifications-delete-modal");
  if (!modal) return;
  notificationsDeletePending = false;
  modal.hidden = true;
}

async function handleConfirmDeleteAllNotifications() {
  if (!notificationsDeletePending) return;
  try {
    await apiDeleteAllNotifications();
    closeNotificationsDeleteModal();
    await loadNotifications();
  } catch (err) {
    showAlert(
      "profile-alert",
      err.message || "Could not delete all notifications.",
      "error",
    );
  }
}

function handlePlacePhotoEdit() {
  if (!isOwnProfile) return;
  const placePhotoInput = document.getElementById("place-photo-input");
  if (!placePhotoInput) return;
  placePhotoInput.click();
}

function handlePlacePhotoSelected(event) {
  const files = Array.from(event.target.files || []);
  if (files.length === 0) return;

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      showAlert("place-form-alert", "Please select image files only.", "error");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      showAlert(
        "place-form-alert",
        "Each image must be smaller than 5 MB.",
        "error",
      );
      event.target.value = "";
      return;
    }
  }

  uploadSelectedPlacePhotos(files).finally(() => {
    event.target.value = "";
  });
}

async function uploadSelectedPlacePhotos(files) {
  setLoading("place", true);
  showAlert("place-form-alert", "", "error");

  try {
    for (const file of files) {
      const result = await apiUploadPlacePhoto(file);
      const imageUrl = result?.image_url || "";
      if (imageUrl && !currentPlaceImageUrls.includes(imageUrl)) {
        currentPlaceImageUrls.push(imageUrl);
      }
    }
    syncPlaceImageFields();
    renderPlacePhotoPreview(
      currentPlaceImageUrls,
      document.getElementById("place_title").value.trim(),
    );
    showAlert(
      "place-form-alert",
      files.length > 1
        ? "Place photos uploaded successfully."
        : "Place photo uploaded successfully.",
      "success",
    );
  } catch (err) {
    showAlert(
      "place-form-alert",
      err.message || "Could not upload the place photos.",
      "error",
    );
  } finally {
    setLoading("place", false);
  }
}

function renderPlacePhotoPreview(imageUrls, title) {
  const preview = document.getElementById("place-photo-preview");
  const placeholder = document.getElementById("place-photo-placeholder");
  const label = document.getElementById("place-photo-label");
  const gallery = document.getElementById("place-photo-gallery");
  if (!preview || !placeholder || !label || !gallery) return;

  if (Array.isArray(imageUrls) && imageUrls.length > 0) {
    preview.src = resolvePlaceImageUrl(imageUrls[0]);
    preview.alt = title ? `${title} preview` : "Place preview";
    preview.hidden = false;
    placeholder.hidden = true;
    label.textContent = "Add or change photos";
    gallery.replaceChildren(
      ...imageUrls.map((imageUrl, index) => {
        const item = document.createElement("div");
        item.className = "place-photo-gallery-item";

        const image = document.createElement("img");
        image.src = resolvePlaceImageUrl(imageUrl);
        image.alt = title
          ? `${title} photo ${index + 1}`
          : `Place photo ${index + 1}`;
        image.className = "place-photo-gallery-image";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "place-photo-remove";
        button.setAttribute("aria-label", "Remove photo");
        button.textContent = "Remove";
        button.dataset.imageIndex = String(index);
        button.addEventListener("click", () => {
          currentPlaceImageUrls.splice(Number(button.dataset.imageIndex), 1);
          syncPlaceImageFields();
          renderPlacePhotoPreview(
            currentPlaceImageUrls,
            document.getElementById("place_title").value.trim(),
          );
        });

        item.appendChild(image);
        item.appendChild(button);
        return item;
      }),
    );
    return;
  }

  preview.hidden = true;
  preview.removeAttribute("src");
  placeholder.hidden = false;
  label.textContent = "Choose photos from your device";
  gallery.replaceChildren();
}

function syncPlaceImageFields() {
  document.getElementById("place_image_url").value =
    currentPlaceImageUrls[0] || "";
  document.getElementById("place_image_urls").value = JSON.stringify(
    currentPlaceImageUrls,
  );
}

function renderAmenityChoices(items) {
  const container = document.getElementById("modal-amenities-list");
  if (!container) return;

  if (!Array.isArray(items) || items.length === 0) {
    const message = document.createElement("p");
    message.className = "helper-text-muted";
    message.textContent = "No amenities available.";
    container.replaceChildren(message);
    updateAmenitySelectionSummary();
    return;
  }

  container.replaceChildren(
    ...items.map((amenity) => {
      const label = document.createElement("label");
      label.className = "amenity-option";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = amenity.id;

      const span = document.createElement("span");
      span.className = "amenity-option-label";
      span.textContent = amenity.name;

      label.appendChild(input);
      label.appendChild(span);
      return label;
    }),
  );

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

  const cityInput = document.getElementById("place_city");
  const cityQuery = cityInput?.value.trim() || "";

  let geocodedLocation = null;
  try {
    geocodedLocation = await forwardGeocode(cityQuery);
  } catch (err) {
    showAlert(
      "place-form-alert",
      err.message || "Unable to find this city.",
      "error",
    );
    return;
  }

  document.getElementById("place_latitude").value = String(
    geocodedLocation.latitude,
  );
  document.getElementById("place_longitude").value = String(
    geocodedLocation.longitude,
  );
  if (cityInput) {
    cityInput.value = geocodedLocation.label;
  }

  const payload = {
    title: document.getElementById("place_title").value.trim(),
    description: document.getElementById("place_description").value.trim(),
    image_url: currentPlaceImageUrls[0] || "",
    image_urls: [...currentPlaceImageUrls],
    price: parseFloat(document.getElementById("place_price").value),
    latitude: geocodedLocation.latitude,
    longitude: geocodedLocation.longitude,
    amenities: Array.from(
      document.querySelectorAll("#modal-amenities-list input:checked"),
    ).map((input) => input.value),
  };

  if (
    !payload.title ||
    payload.image_urls.length === 0 ||
    Number.isNaN(payload.price) ||
    Number.isNaN(payload.latitude) ||
    Number.isNaN(payload.longitude)
  ) {
    showAlert(
      "place-form-alert",
      "Please fill in all required fields, choose a city, and add at least one photo.",
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
    placesCollectionPromise = null;
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
  const confirmed = await confirmAction({
    kicker: "Your places",
    title: "Delete this place?",
    message: "This action permanently removes the listing.",
    confirmLabel: "Delete",
  });
  if (!confirmed) return;

  try {
    await apiDeletePlace(placeId);
    placesCollectionPromise = null;
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

async function handleTogglePlaceVisibility(placeId, isHidden) {
  if (!isOwnProfile) return;

  const confirmMessage = isHidden
    ? "Show this place again? It will be visible to users."
    : "Hide this place? It will stay in your profile dashboard but disappear for other users.";
  const confirmed = await confirmAction({
    kicker: "Your places",
    title: isHidden ? "Show this place?" : "Hide this place?",
    message: confirmMessage,
    confirmLabel: isHidden ? "Show place" : "Hide place",
    confirmClassName: isHidden
      ? "login-button"
      : "login-button profile-delete-btn",
  });
  if (!confirmed) return;

  try {
    await apiUpdatePlace(placeId, { is_hidden: !isHidden });
    placesCollectionPromise = null;
    showAlert(
      "places-alert",
      isHidden ? "Place is visible again." : "Place hidden successfully.",
      "success",
    );
    await loadPlaces(currentProfileId);
  } catch (err) {
    showAlert(
      "places-alert",
      err.message || "Unable to update place visibility.",
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
  const imageUrl = resolvePlaceImageUrl(getPrimaryPlaceImage(place));
  const article = document.createElement("article");
  article.className = "place-card fade-in";

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "place-card-image-wrapper";

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = place.title || "Place image";
  image.className = "place-card-image";
  image.addEventListener("error", () => {
    image.src = `${window.location.origin}/assets/demo-places/paris-studio.jpg`;
  });
  imageWrapper.appendChild(image);

  const title = document.createElement("h3");
  title.className = "place-card-title";
  title.textContent = place.title || "Untitled place";

  const meta = document.createElement("div");
  meta.className = "place-card-meta";

  const badge = document.createElement("span");
  badge.className = "badge badge-price";
  badge.textContent = price;
  meta.appendChild(badge);

  if (place.is_hidden) {
    const visibilityBadge = document.createElement("span");
    visibilityBadge.className = "badge badge-hidden";
    visibilityBadge.textContent = "Hidden";
    meta.appendChild(visibilityBadge);
  }

  const desc = document.createElement("p");
  desc.className = "place-card-desc";
  desc.textContent = description;

  const actions = document.createElement("div");
  actions.className = "profile-place-actions";

  const viewLink = document.createElement("a");
  viewLink.href = `place.html?id=${encodeURIComponent(place.id)}`;
  viewLink.className = "details-button";
  viewLink.textContent = "View";
  actions.appendChild(viewLink);

  if (isOwnProfile) {
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "login-button";
    editButton.dataset.action = "edit-place";
    editButton.dataset.placeId = place.id;
    editButton.textContent = "Edit";

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "login-button profile-delete-btn";
    deleteButton.dataset.action = "delete-place";
    deleteButton.dataset.placeId = place.id;
    deleteButton.textContent = "Delete";

    const visibilityButton = document.createElement("button");
    visibilityButton.type = "button";
    visibilityButton.className = "login-button";
    visibilityButton.dataset.action = "toggle-place-visibility";
    visibilityButton.dataset.placeId = place.id;
    visibilityButton.dataset.placeHidden = String(Boolean(place.is_hidden));
    visibilityButton.textContent = place.is_hidden ? "Show" : "Hide";

    actions.appendChild(editButton);
    actions.appendChild(visibilityButton);
    actions.appendChild(deleteButton);
  }

  article.appendChild(imageWrapper);
  article.appendChild(title);
  article.appendChild(meta);
  article.appendChild(desc);
  article.appendChild(actions);
  return article;
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
    if (spinner) spinner.hidden = !loading;
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
  if (spinner) spinner.hidden = !loading;
}

function getInitials(firstName, lastName) {
  return `${(firstName || "H").charAt(0)}${(lastName || "B").charAt(0)}`.toUpperCase();
}

function renderAvatar(user) {
  const fullName =
    `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Host";
  const avatar = document.getElementById("profile-avatar");
  if (!avatar) return;

  avatar.replaceChildren();
  if (user.profile_picture_url) {
    const image = document.createElement("img");
    image.src = user.profile_picture_url;
    image.alt = fullName;
    avatar.appendChild(image);
    return;
  }

  avatar.textContent = getInitials(user.first_name, user.last_name);
}

function renderEmptyState(container, icon, title, message) {
  const state = document.createElement("div");
  state.className = "empty-state fade-in";

  const iconEl = document.createElement("div");
  iconEl.className = "empty-state-icon";
  iconEl.textContent = icon;

  const heading = document.createElement("h3");
  heading.textContent = title;

  const body = document.createElement("p");
  body.textContent = message;

  state.appendChild(iconEl);
  state.appendChild(heading);
  state.appendChild(body);
  container.replaceChildren(state);
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

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function truncateText(value, maxLength = 120) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text;
}

function formatAdminPrice(value) {
  const amount = Number.parseFloat(value);
  if (Number.isNaN(amount)) return "No price";
  return `$${amount.toFixed(0)} / night`;
}
