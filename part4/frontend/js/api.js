/**
 * api.js — Central API layer for HBnB Evolution
 * All fetch calls go through this module.
 */

const API_BASE_URL =
  window.HBNB_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:${window.location.protocol === "https:" ? "5443" : "5001"}/api/v1`;

const REQUEST_TIMEOUT_MS = 12000;

clearLegacyAuthCookie();

function getCookie(name) {
  const match = document.cookie.match(
    new RegExp(
      `(?:^|; )${name.replace(/[.*+?^${}()|[\]\\\\]/g, "\\$&")}=([^;]*)`,
    ),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

// ──────────────────────────────────────────────────
// Core request helper
// ──────────────────────────────────────────────────

async function request(endpoint, options = {}) {
  const suppressUnauthorizedRedirect = Boolean(
    options.suppressUnauthorizedRedirect,
  );
  const headers = {
    ...(options.headers || {}),
  };

  delete options.suppressUnauthorizedRedirect;

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const method = String(options.method || "GET").toUpperCase();
  const isIdempotent = ["GET", "HEAD", "OPTIONS"].includes(method);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrfToken = getCookie("csrf_access_token");
    if (csrfToken) {
      headers["X-CSRF-TOKEN"] = csrfToken;
    }
  }

  let response = null;
  let lastNetworkError = null;

  for (let attempt = 0; attempt < (isIdempotent ? 2 : 1); attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort("request-timeout"),
      REQUEST_TIMEOUT_MS,
    );

    try {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);
      break;
    } catch (networkError) {
      window.clearTimeout(timeoutId);
      lastNetworkError = networkError;
      if (!isIdempotent || attempt > 0) {
        console.error(
          "[HBnB] Network error — backend unreachable.\n" +
            `Make sure Flask is running on ${API_BASE_URL}\n`,
        );
        if (networkError?.name === "AbortError") {
          throw new Error("The server took too long to respond.");
        }
        throw new Error("Unable to reach the server. Is the backend running?");
      }
      await new Promise((resolve) => window.setTimeout(resolve, 350));
    }
  }

  if (!response) {
    if (lastNetworkError?.name === "AbortError") {
      throw new Error("The server took too long to respond.");
    }
    throw new Error("Unable to reach the server. Is the backend running?");
  }

  // 401 → clear token + redirect
  if (response.status === 401) {
    console.warn("[HBnB] 401 Unauthorized — redirecting to login");
    if (suppressUnauthorizedRedirect) {
      return null;
    }
    localStorage.removeItem("hbnb-current-user");
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
    credentials: "include",
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
    credentials: "include",
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

  return body;
}

export async function apiGetCurrentUser() {
  return request("/auth/me", { suppressUnauthorizedRedirect: true });
}

export async function apiLogout() {
  return request("/auth/logout", {
    method: "POST",
    body: JSON.stringify({}),
  });
}

function clearLegacyAuthCookie() {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `token=; Max-Age=0; path=/; SameSite=Lax${secure}`;
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
