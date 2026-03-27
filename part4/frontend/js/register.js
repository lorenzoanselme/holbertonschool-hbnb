/**
 * register.js — Registration page logic.
 */

import { redirectIfLoggedIn } from './auth.js';
import { apiRegister, apiLogin } from './api.js';
import { setToken } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  redirectIfLoggedIn();

  const form    = document.getElementById('register-form');
  const alert   = document.getElementById('register-alert');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert(alert);

    const first_name = form.querySelector('#first_name').value.trim();
    const last_name  = form.querySelector('#last_name').value.trim();
    const email      = form.querySelector('#email').value.trim();
    const password   = form.querySelector('#password').value;
    const confirm    = form.querySelector('#confirm_password').value;

    if (!first_name || !last_name || !email || !password) {
      showAlert(alert, 'Please fill in all fields.');
      return;
    }

    if (password !== confirm) {
      showAlert(alert, 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      showAlert(alert, 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      await apiRegister(first_name, last_name, email, password);

      // Auto-login after registration
      const data  = await apiLogin(email, password);
      const token = data.access_token || data.token;
      if (token) {
        setToken(token);
        window.location.href = 'index.html';
      } else {
        // Registration succeeded but auto-login failed — go to login
        window.location.href = 'login.html';
      }
    } catch (err) {
      showAlert(alert, err.message || 'Registration failed. Please try again.');
      setLoading(false);
    }
  });
});

function showAlert(el, message) {
  if (!el) return;
  el.textContent = message;
  el.className = 'alert alert-error show';
}

function hideAlert(el) {
  if (!el) return;
  el.className = 'alert';
  el.textContent = '';
}

function setLoading(loading) {
  const btn     = document.getElementById('register-btn');
  const btnText = document.getElementById('btn-text');
  const spinner = document.getElementById('btn-spinner');

  if (btn)     btn.disabled       = loading;
  if (btnText) btnText.textContent = loading ? 'Creating account…' : 'Create Account';
  if (spinner) spinner.style.display = loading ? 'inline-block' : 'none';
}
