/**
 * places.js — Index page: fetch and render places list with price filter.
 */

import { requireAuth, updateNavbar, logout } from './auth.js';
import { apiGetPlaces } from './api.js';

// ──────────────────────────────────────────────────
// Init
// ──────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  updateNavbar();

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  loadPlaces();

  const priceFilter = document.getElementById('price-filter');
  if (priceFilter) {
    priceFilter.addEventListener('change', () => {
      filterAndRender(allPlaces, priceFilter.value);
    });
  }
});

// ──────────────────────────────────────────────────
// State
// ──────────────────────────────────────────────────

let allPlaces = [];

// ──────────────────────────────────────────────────
// Fetch places
// ──────────────────────────────────────────────────

async function loadPlaces() {
  const grid    = document.getElementById('places-list');
  const filter  = document.getElementById('price-filter');

  showSpinner(grid);

  try {
    const data = await apiGetPlaces();
    allPlaces  = Array.isArray(data) ? data : [];

    if (allPlaces.length === 0) {
      showEmpty(grid);
      return;
    }

    if (filter) {
      filterAndRender(allPlaces, filter.value);
    } else {
      renderPlaces(grid, allPlaces);
    }
  } catch (err) {
    console.error('[HBnB] Failed to load places:', err.message);
    showError(grid, err.message);
  }
}

// ──────────────────────────────────────────────────
// Filter
// ──────────────────────────────────────────────────

function filterAndRender(places, maxPrice) {
  const grid = document.getElementById('places-list');

  let filtered = places;
  if (maxPrice && maxPrice !== 'all') {
    const limit = parseFloat(maxPrice);
    filtered = places.filter(p => parseFloat(p.price) <= limit);
  }

  if (filtered.length === 0) {
    showEmpty(grid, 'No places match this filter.');
    return;
  }

  renderPlaces(grid, filtered);
}

// ──────────────────────────────────────────────────
// Render
// ──────────────────────────────────────────────────

function renderPlaces(grid, places) {
  grid.innerHTML = '';
  grid.className = 'places-list places-grid';

  places.forEach((place, i) => {
    const card = createPlaceCard(place);
    card.style.animationDelay = `${i * 60}ms`;
    grid.appendChild(card);
  });
}

function createPlaceCard(place) {
  const href = `place.html?id=${encodeURIComponent(place.id)}`;
  const card = document.createElement('article');
  card.className = 'place-card fade-in';
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => { window.location.href = href; });

  const title = place.title || place.name || 'Unnamed Place';
  const price = place.price != null ? `$${parseFloat(place.price).toFixed(0)} / night` : 'N/A';
  const desc  = place.description
    ? place.description.substring(0, 100) + (place.description.length > 100 ? '…' : '')
    : 'No description available.';

  card.innerHTML = `
    <h2 class="place-card-title">${escapeHtml(title)}</h2>
    <div class="place-card-meta">
      <span class="badge badge-price">${escapeHtml(price)}</span>
    </div>
    <p class="place-card-desc">${escapeHtml(desc)}</p>
    <div style="margin-top:auto;padding-top:8px;">
      <a href="${href}" class="details-button">
        View Details
      </a>
    </div>
  `;

  return card;
}

// ──────────────────────────────────────────────────
// UI states
// ──────────────────────────────────────────────────

function showSpinner(container) {
  container.className = '';
  container.innerHTML = `
    <div class="spinner-wrapper">
      <div class="spinner"></div>
    </div>
  `;
}

function showEmpty(container, message = 'No places available yet.') {
  container.className = '';
  container.innerHTML = `
    <div class="empty-state fade-in">
      <div class="empty-state-icon">🏠</div>
      <h3>Nothing here</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function showError(container, message) {
  container.className = '';
  container.innerHTML = `
    <div class="empty-state fade-in">
      <div class="empty-state-icon">⚠️</div>
      <h3>Failed to load places</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

// ──────────────────────────────────────────────────
// XSS-safe escape
// ──────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
