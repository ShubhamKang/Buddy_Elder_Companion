import api from './client';

export const bookingsApi = {
  create: (body) => api.post('/bookings', body).then((r) => r.data),
  mineElder: (params) => api.get('/bookings/mine/elder', { params }).then((r) => r.data),
  mineBuddy: (params) => api.get('/bookings/mine/buddy', { params }).then((r) => r.data),
  open: (params) => api.get('/bookings/open', { params }).then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  cancel: (id, reason) => api.post(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),
  accept: (id) => api.post(`/bookings/${id}/accept`).then((r) => r.data),
  reject: (id) => api.post(`/bookings/${id}/reject`).then((r) => r.data),
  start: (id) => api.post(`/bookings/${id}/start`).then((r) => r.data),
  complete: (id) => api.post(`/bookings/${id}/complete`).then((r) => r.data),
};

export const geoApi = {
  updateMyLocation: (latitude, longitude) =>
    api.put('/buddies/me/location', { latitude, longitude }).then((r) => r.data),
  nearby: (lat, lng, radiusKm = 10, limit) =>
    api.get('/buddies/nearby', { params: { lat, lng, radiusKm, limit } }).then((r) => r.data),
};

export const notificationsApi = {
  list: (params) => api.get('/notifications', { params }).then((r) => r.data),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
};

export const sosApi = {
  listContacts: () => api.get('/sos/contacts').then((r) => r.data),
  addContact: (body) => api.post('/sos/contacts', body).then((r) => r.data),
  removeContact: (id) => api.delete(`/sos/contacts/${id}`).then((r) => r.data),
  trigger: (body) => api.post('/sos/alerts', body).then((r) => r.data),
  resolve: (id) => api.post(`/sos/alerts/${id}/resolve`).then((r) => r.data),
  listAlerts: (params) => api.get('/sos/alerts', { params }).then((r) => r.data),
};

export const careApi = {
  listReminders: (params) => api.get('/care/reminders', { params }).then((r) => r.data),
  createReminder: (body) => api.post('/care/reminders', body).then((r) => r.data),
  removeReminder: (id) => api.delete(`/care/reminders/${id}`).then((r) => r.data),
  listPlans: () => api.get('/care/plans').then((r) => r.data),
  createPlan: (body) => api.post('/care/plans', body).then((r) => r.data),
  deactivatePlan: (id) => api.delete(`/care/plans/${id}`).then((r) => r.data),
};

export const reviewsApi = {
  create: (bookingId, body) => api.post(`/bookings/${bookingId}/review`, body).then((r) => r.data),
  // 404 means the booking has not been reviewed yet.
  get: (bookingId) => api.get(`/bookings/${bookingId}/review`).then((r) => r.data),
  forBuddy: (buddyId, params) => api.get(`/buddies/${buddyId}/reviews`, { params }).then((r) => r.data),
};

export const paymentsApi = {
  // Idempotent: repeating the same key returns the original payment.
  charge: (bookingId, amount, idempotencyKey) =>
    api.post(`/bookings/${bookingId}/payment`, { amount, idempotencyKey }).then((r) => r.data),
  refund: (bookingId) => api.post(`/bookings/${bookingId}/payment/refund`).then((r) => r.data),
  get: (bookingId) => api.get(`/bookings/${bookingId}/payment`).then((r) => r.data),
};

export const walletApi = {
  get: () => api.get('/wallet').then((r) => r.data),
  transactions: (params) => api.get('/wallet/transactions', { params }).then((r) => r.data),
};

export const chatApi = {
  history: (bookingId, params) => api.get(`/bookings/${bookingId}/chat`, { params }).then((r) => r.data),
  send: (bookingId, content) => api.post(`/bookings/${bookingId}/chat`, { content }).then((r) => r.data),
};

export const adminApi = {
  users: (params) => api.get('/admin/users', { params }).then((r) => r.data),
  bookings: (params) => api.get('/admin/bookings', { params }).then((r) => r.data),
  pendingVerifications: (params) => api.get('/admin/verifications/pending', { params }).then((r) => r.data),
  decideVerification: (buddyUserId, approve, note) =>
    api.post(`/admin/verifications/${buddyUserId}`, { approve, note }).then((r) => r.data),
  auditLog: (params) => api.get('/admin/audit-log', { params }).then((r) => r.data),
};
