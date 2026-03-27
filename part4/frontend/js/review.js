/**
 * review.js — Add Review page (add_review.html).
 * Unauthenticated users are redirected to index.html.
 * Submits review via Fetch API with JWT token.
 */

import { updateNavbar, logout } from './auth.js';
import { getCookie } from './api.js';
import { apiCreateReview } from './api.js';

// ──────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  updateNavbar();

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  const token   = checkAuthentication();
  const placeId = getPlaceIdFromURL();

  if (!placeId) {
    showAlert('Missing place ID. Please go back and try again.', 'error');
    disableForm();
    return;
  }

  // Update back link to point to the correct place
  const backLink = document.getElementById('back-to-place');
  if (backLink) backLink.href = `place.html?id=${encodeURIComponent(placeId)}`;

  const reviewForm = document.getElementById('review-form');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const reviewText = (document.getElementById('review').value || '').trim();
      const rating     = parseInt(document.getElementById('rating').value);

      if (!reviewText) {
        showAlert('Please write your review before submitting.', 'error');
        return;
      }
      if (!rating || rating < 1 || rating > 5) {
        showAlert('Please select a rating.', 'error');
        return;
      }

      await submitReview(token, placeId, reviewText, rating);
    });
  }
});

// ──────────────────────────────────────────────────
// Check authentication — redirect to index if not logged in
// ──────────────────────────────────────────────────

function checkAuthentication() {
  const token = getCookie('token');
  if (!token) {
    window.location.href = 'index.html';
  }
  return token;
}

// ──────────────────────────────────────────────────
// Get place ID from URL
// ──────────────────────────────────────────────────

function getPlaceIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('place_id');
}

// ──────────────────────────────────────────────────
// Submit review via Fetch API
// ──────────────────────────────────────────────────

async function submitReview(token, placeId, reviewText, rating) {
  setSubmitLoading(true);
  clearAlert();

  try {
    await apiCreateReview({ place_id: placeId, text: reviewText, rating });
    handleResponse(true, placeId);
  } catch (err) {
    console.error('[HBnB] Review submission failed:', err.message);
    handleResponse(false, placeId, err.message);
  } finally {
    setSubmitLoading(false);
  }
}

// ──────────────────────────────────────────────────
// Handle API response
// ──────────────────────────────────────────────────

function handleResponse(success, placeId, errorMessage) {
  if (success) {
    showAlert('Review submitted successfully!', 'success');
    // Clear the form
    const form = document.getElementById('review-form');
    if (form) form.reset();
    // Redirect back to place after short delay
    setTimeout(() => {
      window.location.href = `place.html?id=${encodeURIComponent(placeId)}`;
    }, 1500);
  } else {
    showAlert(errorMessage || 'Failed to submit review', 'error');
  }
}

// ──────────────────────────────────────────────────
// UI helpers
// ──────────────────────────────────────────────────

function showAlert(message, type = 'error') {
  const el = document.getElementById('review-alert');
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = message;
}

function clearAlert() {
  const el = document.getElementById('review-alert');
  if (el) { el.className = 'alert'; el.textContent = ''; }
}

function setSubmitLoading(loading) {
  const btn     = document.getElementById('submit-btn');
  const btnText = document.getElementById('submit-btn-text');
  const spinner = document.getElementById('submit-spinner');
  if (btn)     btn.disabled          = loading;
  if (btnText) btnText.textContent   = loading ? 'Submitting…' : 'Submit Review';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function disableForm() {
  const form = document.getElementById('review-form');
  if (form) form.querySelectorAll('input, textarea, select, button')
    .forEach(el => el.disabled = true);
}
