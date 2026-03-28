(function () {
  try {
    if (localStorage.getItem("hbnb-theme") === "dark") {
      document.documentElement.dataset.theme = "dark";
    }
  } catch {
    // Ignore storage access errors during bootstrap.
  }
})();
