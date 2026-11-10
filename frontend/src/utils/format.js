// Small formatting / error helpers shared by the new screens.

const rupee = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

export const formatMoney = (value) => rupee.format(Number(value || 0));

export const formatDateTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const formatDate = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
};

/** "5 min ago", "2 h ago", "3 d ago" */
export const timeAgo = (iso) => {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} d ago`;
};

/** Pulls a human-readable message out of an axios error / API error body. */
export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') => {
  const data = err?.response?.data;
  if (data?.violations?.length) {
    return data.violations.map((v) => v.message).join('. ');
  }
  if (data?.message && data.message !== 'No message available') return data.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Is the backend running?';
  return fallback;
};

/** Reads the location saved by the location picker (see LocationPopup). */
export const getSavedLocation = () => {
  try {
    const raw = localStorage.getItem('userLocation');
    if (!raw) return null;
    const loc = JSON.parse(raw);
    const lat = Number(loc.lat ?? loc.latitude);
    const lng = Number(loc.lng ?? loc.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return { ...loc, lat: null, lng: null };
    return { ...loc, lat, lng };
  } catch (_) {
    return null;
  }
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .map((p) => (p.match(/\p{L}/u) || [''])[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('') || '?';

/** Creates a random idempotency key for payment retries. */
export const newIdempotencyKey = () =>
  (window.crypto?.randomUUID && window.crypto.randomUUID()) ||
  `key-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** Browser geolocation as a promise. */
export const getCurrentPosition = (options = {}) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.message || 'Could not get your location.')),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000, ...options }
    );
  });
