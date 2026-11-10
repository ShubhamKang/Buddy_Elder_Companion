import axios from 'axios';
import { tokenStore } from './tokenStore';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

// Shared axios instance pointed at the Spring Boot API.
const api = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// A bare client (no interceptors) used for the refresh call itself, to avoid
// infinite loops when the refresh endpoint is hit.
const refreshClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
});

// --- Request interceptor: attach the bearer token ---
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Response interceptor: on 401, try a single refresh then retry ---
// Concurrent 401s share one in-flight refresh so we only rotate once.
let refreshPromise = null;

// Called when the session can no longer be recovered. Overridable by the auth
// layer so it can redirect to login.
let onAuthFailure = () => {
  tokenStore.clear();
};

export function setAuthFailureHandler(handler) {
  onAuthFailure = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Only attempt a refresh once per request, and never for the auth calls.
    const isAuthCall = original?.url?.includes('/auth/login')
      || original?.url?.includes('/auth/register')
      || original?.url?.includes('/auth/refresh');

    if (status === 401 && !original._retry && !isAuthCall) {
      const refreshToken = tokenStore.getRefresh();
      if (!refreshToken) {
        onAuthFailure();
        return Promise.reject(error);
      }
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = refreshClient
            .post('/auth/refresh', { refreshToken })
            .finally(() => {
              // Cleared after settling so the next 401 starts a fresh refresh.
              setTimeout(() => {
                refreshPromise = null;
              }, 0);
            });
        }
        const { data } = await refreshPromise;
        tokenStore.set(data.accessToken, data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        onAuthFailure();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
