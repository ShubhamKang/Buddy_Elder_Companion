import api from './client';

export const profilesApi = {
  getMyElderProfile: () => api.get('/profiles/elder/me').then((r) => r.data),
  upsertElderProfile: (body) => api.put('/profiles/elder/me', body).then((r) => r.data),
  getMyBuddyProfile: () => api.get('/profiles/buddy/me').then((r) => r.data),
  upsertBuddyProfile: (body) => api.put('/profiles/buddy/me', body).then((r) => r.data),
  getBuddy: (userId) => api.get(`/profiles/buddy/${userId}`).then((r) => r.data),
  listAvailableBuddies: (params) => api.get('/profiles/buddy', { params }).then((r) => r.data),
};

export const addressesApi = {
  list: (params) => api.get('/addresses', { params }).then((r) => r.data),
  get: (id) => api.get(`/addresses/${id}`).then((r) => r.data),
  create: (body) => api.post('/addresses', body).then((r) => r.data),
  update: (id, body) => api.put(`/addresses/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/addresses/${id}`).then((r) => r.data),
};
