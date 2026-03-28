/**
 * auth.js — Authentication utilities
 * Handles session bootstrap, login redirect, and logout.
 */

import { apiGetCurrentUser, apiLogin, apiLogout } from "./api.js";

const AUTH_STORAGE_KEY = "hbnb-current-user";

// ──────────────────────────────────────────────────
// Token helpers
// ──────────────────────────────────────────────────

function readStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
}

export function getCurrentUser() {
  return readStoredUser();
}

export function isLoggedIn() {
  return !!readStoredUser();
}

export function getCurrentUserId() {
  return readStoredUser()?.id || null;
}

// ──────────────────────────────────────────────────
// Guard: redirect to login if not authenticated
// ──────────────────────────────────────────────────

export function requireAuth() {
  if (!isLoggedIn()) {
    apiGetCurrentUser()
      .then((response) => {
        if (response?.user) {
          storeUser(response.user);
          updateNavbar();
          return;
        }
        window.location.href = "login.html";
      })
      .catch(() => {
        window.location.href = "login.html";
      });
  }
}

// ──────────────────────────────────────────────────
// Guard: redirect away from login if already authenticated
// ──────────────────────────────────────────────────

export function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = "index.html";
    return;
  }
  apiGetCurrentUser()
    .then((response) => {
      if (response?.user) {
        storeUser(response.user);
        window.location.href = "index.html";
      }
    })
    .catch(() => {});
}

// ──────────────────────────────────────────────────
// Update navbar based on auth state
// ──────────────────────────────────────────────────

export function updateNavbar() {
  if (!isLoggedIn()) {
    apiGetCurrentUser()
      .then((response) => {
        if (response?.user) {
          storeUser(response.user);
          updateNavbar();
        }
      })
      .catch(() => {});
  }

  const loginLink =
    document.getElementById("login-link") ||
    document.getElementById("nav-login");
  const logoutBtn = document.getElementById("nav-logout");
  const profileLink = document.getElementById("nav-profile");
  const addPlaceLink = document.getElementById("nav-add-place");

  if (isLoggedIn()) {
    if (loginLink) loginLink.hidden = true;
    if (logoutBtn) logoutBtn.hidden = false;
    if (profileLink) profileLink.hidden = false;
    if (addPlaceLink) addPlaceLink.hidden = false;
  } else {
    if (loginLink) loginLink.hidden = false;
    if (logoutBtn) logoutBtn.hidden = true;
    if (profileLink) profileLink.hidden = true;
    if (addPlaceLink) addPlaceLink.hidden = true;
  }
}

// ──────────────────────────────────────────────────
// Logout
// ──────────────────────────────────────────────────

export async function logout() {
  try {
    await apiLogout();
  } catch {
    // Keep local cleanup even if backend logout fails.
  }
  storeUser(null);
  window.location.href = "login.html";
}

// ──────────────────────────────────────────────────
// Login form handler (used in login.html)
// ──────────────────────────────────────────────────

export function initLoginPage() {
  redirectIfLoggedIn();

  const form = document.getElementById("login-form");
  const alert = document.getElementById("login-alert");
  const btnText = document.getElementById("btn-text");
  const spinner = document.getElementById("btn-spinner");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    hideAlert(alert);

    const email = form.querySelector("#email").value.trim();
    const password = form.querySelector("#password").value;

    if (!email || !password) {
      showAlert(alert, "Please fill in all fields.");
      return;
    }

    setLoading(btnText, spinner, true);

    try {
      const data = await apiLogin(email, password);
      if (!data?.user) throw new Error("No user received from server.");
      storeUser(data.user);
      window.location.href = "index.html";
    } catch (err) {
      showAlert(alert, err.message || "Login failed. Please try again.");
    } finally {
      setLoading(btnText, spinner, false);
    }
  });
}

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

function showAlert(el, message) {
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
}

function hideAlert(el) {
  if (!el) return;
  el.classList.remove("show");
  el.textContent = "";
}

function setLoading(btnText, spinner, loading) {
  if (btnText) btnText.textContent = loading ? "Signing in…" : "Sign In";
  if (spinner) spinner.hidden = !loading;
  const btn = document.getElementById("login-btn");
  if (btn) btn.disabled = loading;
}
