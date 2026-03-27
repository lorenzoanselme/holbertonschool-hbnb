/**
 * theme.js — Light / Dark mode toggle with localStorage persistence.
 * Import and call initTheme() on every page.
 */

const STORAGE_KEY = "hbnb-theme";

export function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  // Default: light
  const theme = saved || "light";
  applyTheme(theme);
  initMobileNav();

  // Wire every .theme-toggle button on the page
  document.querySelectorAll(".theme-toggle").forEach((btn) => {
    updateIcon(btn, theme);
    btn.addEventListener("click", () => {
      const current = document.documentElement.dataset.theme || "light";
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE_KEY, next);
      document
        .querySelectorAll(".theme-toggle")
        .forEach((b) => updateIcon(b, next));
    });
  });
}

function applyTheme(theme) {
  if (theme === "dark") {
    document.documentElement.dataset.theme = "dark";
  } else {
    delete document.documentElement.dataset.theme;
  }
}

function updateIcon(btn, theme) {
  btn.textContent = theme === "dark" ? "☀️" : "🌙";
  btn.setAttribute(
    "aria-label",
    theme === "dark" ? "Switch to light mode" : "Switch to dark mode",
  );
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-menu-toggle");
  const actions = document.querySelector(".navbar-actions");
  const navbar = document.querySelector(".navbar");

  if (!toggle || !actions || !navbar) return;

  const syncMenuState = (isOpen) => {
    actions.classList.toggle("is-open", isOpen);
    navbar.dataset.menuOpen = isOpen ? "true" : "false";
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  const closeMenu = () => {
    syncMenuState(false);
  };

  const toggleMenu = () => {
    const isOpen = !actions.classList.contains("is-open");
    syncMenuState(isOpen);
  };

  toggle.addEventListener("click", toggleMenu);

  actions.querySelectorAll("a, button").forEach((item) => {
    if (item === toggle) return;
    item.addEventListener("click", () => {
      if (window.innerWidth <= 640) {
        closeMenu();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 640) {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (window.innerWidth > 640) return;
    if (!navbar.contains(event.target)) {
      closeMenu();
    }
  });

  closeMenu();
}
