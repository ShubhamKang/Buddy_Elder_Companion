import api from './client';
import { tokenStore } from './tokenStore';

export const authApi = {
  async register({ email, password, fullName, phone, role }) {
    const { data } = await api.post('/auth/register', { email, password, fullName, phone, role });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  async login({ email, password }) {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.accessToken, data.refreshToken);
    return data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return data;
  },
  logout() {
    tokenStore.clear();
  },
};
