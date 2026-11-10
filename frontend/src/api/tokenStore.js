// Persists JWT access and refresh tokens in localStorage. Centralizing this
// keeps token handling in one place for the API client and auth context.

const ACCESS_KEY = 'buddy.accessToken';
const REFRESH_KEY = 'buddy.refreshToken';

export const tokenStore = {
  getAccess() {
    return localStorage.getItem(ACCESS_KEY);
  },
  getRefresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(accessToken, refreshToken) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  isAuthenticated() {
    return Boolean(localStorage.getItem(ACCESS_KEY));
  },
};
