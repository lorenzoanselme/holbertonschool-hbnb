import { requireAuth, updateNavbar, logout } from './auth.js';
import { apiCreatePlace, apiGetAmenities } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
  requireAuth();
  updateNavbar();

  const logoutBtn = document.getElementById('nav-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  await loadAmenities();

  const form = document.getElementById('place-form');
  if (form) form.addEventListener('submit', handleSubmit);
});

async function loadAmenities() {
  const container = document.getElementById('amenities-list');
  if (!container) return;

  try {
    const amenities = await apiGetAmenities();
    if (!Array.isArray(amenities) || amenities.length === 0) {
      container.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;">No amenities available.</p>';
      return;
    }

    container.innerHTML = amenities.map((amenity) => `
      <label class="amenity-option">
        <input type="checkbox" value="${escapeHtml(amenity.id)}">
        <span>${escapeHtml(amenity.name)}</span>
      </label>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);font-size:0.875rem;">${escapeHtml(err.message)}</p>`;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  showAlert('');

  const payload = {
    title: document.getElementById('title').value.trim(),
    description: document.getElementById('description').value.trim(),
    price: parseFloat(document.getElementById('price').value),
    latitude: parseFloat(document.getElementById('latitude').value),
    longitude: parseFloat(document.getElementById('longitude').value),
    amenities: Array.from(document.querySelectorAll('#amenities-list input:checked')).map((input) => input.value),
  };

  if (!payload.title || Number.isNaN(payload.price) || Number.isNaN(payload.latitude) || Number.isNaN(payload.longitude)) {
    showAlert('Please fill in all required fields.', 'error');
    return;
  }

  setLoading(true);
  try {
    const place = await apiCreatePlace(payload);
    window.location.href = `place.html?id=${encodeURIComponent(place.id)}`;
  } catch (err) {
    showAlert(err.message || 'Unable to create place.', 'error');
  } finally {
    setLoading(false);
  }
}

function showAlert(message, type = 'error') {
  const alert = document.getElementById('form-alert');
  if (!alert) return;
  alert.className = message ? `alert alert-${type} show` : 'alert';
  alert.textContent = message;
}

function setLoading(loading) {
  const btn = document.getElementById('submit-btn');
  const btnText = document.getElementById('submit-btn-text');
  const spinner = document.getElementById('submit-spinner');

  if (btn) btn.disabled = loading;
  if (btnText) btnText.textContent = loading ? 'Publishing…' : 'Publish Place';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
