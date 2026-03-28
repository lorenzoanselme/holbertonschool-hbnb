const defaultApiPort = window.location.protocol === "https:" ? "5443" : "5001";

window.HBNB_API_BASE_URL =
  window.HBNB_API_BASE_URL ||
  `${window.location.protocol}//${window.location.hostname}:${defaultApiPort}/api/v1`;
