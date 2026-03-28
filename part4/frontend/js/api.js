/**
 * api.js — Central API layer for HBnB Evolution
 * All fetch calls go through this module.
 */

const API_BASE_URL =
  window.HBNB_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:5001/api/v1`;

// ──────────────────────────────────────────────────
// Cookie helpers
// ──────────────────────────────────────────────────

export function getCookie(name) {
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookie(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

export function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// ──────────────────────────────────────────────────
// Core request helper
// ──────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  const token = getCookie("token");

  const headers = {
    ...(options.headers || {}),
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkError) {
    console.error(
      "[HBnB] Network error — backend unreachable.\n" +
        `Make sure Flask is running on ${API_BASE_URL}\n` +
        "and CORS is enabled:\n\n" +
        "  from flask_cors import CORS\n" +
        "  CORS(app)\n",
    );
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  // 401 → clear token + redirect
  if (response.status === 401) {
    console.warn("[HBnB] 401 Unauthorized — redirecting to login");
    deleteCookie("token");
    window.location.href = "login.html";
    return null;
  }

  // 204 No Content
  if (response.status === 204) return null;

  // Parse body
  let body;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await response.json();
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      (body && body.message) ||
      (body && body.error) ||
      (typeof body === "string" ? body : null) ||
      `HTTP ${response.status}`;
    throw new Error(message);
  }

  return body;
}

// ──────────────────────────────────────────────────
// Auth
// ──────────────────────────────────────────────────

export async function apiRegister(first_name, last_name, email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ first_name, last_name, email, password }),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.error || body.message || "Registration failed");
  }

  return body;
}

export async function apiLogin(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  let body;
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw new Error(body.message || body.error || "Invalid credentials");
  }

  return body; // { access_token: "..." }
}

// ──────────────────────────────────────────────────
// Places
// ──────────────────────────────────────────────────

export async function apiGetUser(id) {
  return request(`/users/${id}`);
}

export async function apiUpdateUser(id, data) {
  return request(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiUploadProfilePhoto(id, file) {
  const formData = new FormData();
  formData.append("photo", file);
  return request(`/users/${id}/photo`, {
    method: "POST",
    body: formData,
  });
}

export async function apiUploadPlacePhoto(file) {
  const formData = new FormData();
  formData.append("photo", file);
  return request("/places/photo", {
    method: "POST",
    body: formData,
  });
}

export async function apiGetPlaces() {
  return request("/places/");
}

export async function apiGetPlace(id) {
  return request(`/places/${id}`);
}

export async function apiCreatePlace(data) {
  return request("/places/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function apiUpdatePlace(id, data) {
  return request(`/places/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function apiDeletePlace(id) {
  return request(`/places/${id}`, { method: "DELETE" });
}

export async function apiGetAmenities() {
  return request("/amenities/");
}

// ──────────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────────

export async function apiCreateReview({ place_id, text, rating }) {
  return request("/reviews/", {
    method: "POST",
    body: JSON.stringify({ place_id, text, rating }),
  });
}

export async function apiGetPlaceReviews(placeId) {
  return request(`/places/${placeId}/reviews`);
}

export async function apiGetReviews() {
  return request("/reviews/");
}

export async function apiRespondToReview(reviewId, response) {
  return request(`/reviews/${reviewId}/response`, {
    method: "PUT",
    body: JSON.stringify({ response }),
  });
}

export async function apiGetNotifications() {
  return request("/notifications/");
}

export async function apiMarkNotificationRead(notificationId) {
  return request(`/notifications/${notificationId}/read`, {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function apiMarkAllNotificationsRead() {
  return request("/notifications/bulk/read", {
    method: "PUT",
    body: JSON.stringify({}),
  });
}

export async function apiDeleteAllNotifications() {
  return request("/notifications/bulk/delete", {
    method: "DELETE",
  });
}

export async function apiDeleteNotification(notificationId) {
  return request(`/notifications/${notificationId}`, {
    method: "DELETE",
  });
}
