const GEO_CACHE_PREFIX = "hbnb-geo-cache:";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function getCurrentPosition(options = {}) {
  if (!("geolocation" in navigator)) {
    return Promise.reject(new Error("Geolocation is not supported by this browser."));
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
      ...options,
    });
  });
}

export function haversineDistanceKm(from, to) {
  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const latDelta = toRadians(to.latitude - from.latitude);
  const lonDelta = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(lonDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(distanceKm) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return "";
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`;
  return `${Math.round(distanceKm)} km away`;
}

export async function reverseGeocode(latitude, longitude) {
  const cacheKey = getReverseCacheKey(latitude, longitude);
  const cached = readCache(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    format: "jsonv2",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "10",
    addressdetails: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Reverse geocoding failed.");
  }

  const body = await response.json();
  const address = body?.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    body?.name ||
    "Unknown area";
  const country = address.country || "";
  const result = {
    city,
    country,
    label: country ? `${city}, ${country}` : city,
  };

  writeCache(cacheKey, result);
  return result;
}

export async function forwardGeocode(query) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    throw new Error("Please enter a city.");
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    q: normalizedQuery,
    limit: "1",
    addressdetails: "1",
  });

  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${params.toString()}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("City search failed.");
  }

  const body = await response.json();
  const match = Array.isArray(body) ? body[0] : null;
  if (!match) {
    throw new Error("City not found. Try a clearer search like 'Paris, France'.");
  }

  const address = match.address || {};
  const city =
    address.city ||
    address.town ||
    address.village ||
    address.municipality ||
    address.county ||
    match.name ||
    normalizedQuery;
  const country = address.country || "";

  return {
    latitude: Number.parseFloat(match.lat),
    longitude: Number.parseFloat(match.lon),
    city,
    country,
    label: country ? `${city}, ${country}` : city,
  };
}

function getReverseCacheKey(latitude, longitude) {
  return `${GEO_CACHE_PREFIX}${latitude.toFixed(3)},${longitude.toFixed(3)}`;
}

function readCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.timestamp || Date.now() - parsed.timestamp > ONE_DAY_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return parsed.value || null;
  } catch {
    return null;
  }
}

function writeCache(key, value) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        timestamp: Date.now(),
        value,
      }),
    );
  } catch {
    // Ignore storage quota issues in the browser cache layer.
  }
}
