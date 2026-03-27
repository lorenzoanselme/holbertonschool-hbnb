/**
 * auth.js — Authentication utilities
 * Handles token storage, login redirect, and logout.
 */

import { getCookie, setCookie, deleteCookie, apiLogin } from './api.js';

// ──────────────────────────────────────────────────
// Token helpers
// ──────────────────────────────────────────────────

export function getToken() {
  return getCookie('token');
}

export function setToken(token) {
  setCookie('token', token, 1); // 1 day
}

export function removeToken() {
  deleteCookie('token');
}

export function isLoggedIn() {
  return !!getToken();
}

export function getCurrentUserId() {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.sub;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────
// Guard: redirect to login if not authenticated
// ──────────────────────────────────────────────────

export function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// ──────────────────────────────────────────────────
// Guard: redirect away from login if already authenticated
// ──────────────────────────────────────────────────

export function redirectIfLoggedIn() {
  if (isLoggedIn()) {
    window.location.href = 'index.html';
  }
}

// ──────────────────────────────────────────────────
// Update navbar based on auth state
// ──────────────────────────────────────────────────

export function updateNavbar() {
  const loginLink   = document.getElementById('login-link') || document.getElementById('nav-login');
  const logoutBtn   = document.getElementById('nav-logout');
  const profileLink = document.getElementById('nav-profile');
  const addPlaceLink = document.getElementById('nav-add-place');

  if (isLoggedIn()) {
    if (loginLink)    loginLink.style.display    = 'none';
    if (logoutBtn)    logoutBtn.style.display    = 'inline-flex';
    if (profileLink)  profileLink.style.display  = 'inline-flex';
    if (addPlaceLink) addPlaceLink.style.display = 'inline-flex';
  } else {
    if (loginLink)    loginLink.style.display    = 'inline-flex';
    if (logoutBtn)    logoutBtn.style.display    = 'none';
    if (profileLink)  profileLink.style.display  = 'none';
    if (addPlaceLink) addPlaceLink.style.display = 'none';
  }
}

// ──────────────────────────────────────────────────
// Logout
// ──────────────────────────────────────────────────

export function logout() {
  removeToken();
  window.location.href = 'login.html';
}

// ──────────────────────────────────────────────────
// Login form handler (used in login.html)
// ──────────────────────────────────────────────────

export function initLoginPage() {
  redirectIfLoggedIn();

  const form    = document.getElementById('login-form');
  const alert   = document.getElementById('login-alert');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alert);

    const email    = form.querySelector('#email').value.trim();
    const password = form.querySelector('#password').value;

    if (!email || !password) {
      showAlert(alert, 'Please fill in all fields.');
      return;
    }

    setLoading(btnText, spinner, true);

    try {
      const data = await apiLogin(email, password);
      const token = data.access_token || data.token;
      if (!token) throw new Error('No token received from server.');
      setToken(token);
      window.location.href = 'index.html';
    } catch (err) {
      showAlert(alert, err.message || 'Login failed. Please try again.');
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
  el.classList.add('show');
}

function hideAlert(el) {
  if (!el) return;
  el.classList.remove('show');
  el.textContent = '';
}

function setLoading(btnText, spinner, loading) {
  if (btnText)  btnText.textContent  = loading ? 'Signing in…' : 'Sign In';
  if (spinner)  spinner.style.display = loading ? 'inline-block' : 'none';
  const btn = document.getElementById('login-btn');
  if (btn) btn.disabled = loading;
}
