import axios from 'axios';

// Backend origin. Dev: leave VITE_API_BASE unset → relative '/platform' via the
// Vite proxy. Prod: set VITE_API_BASE to the backend origin (no trailing slash).
const RAW = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
export const PLATFORM_BASE = RAW ? `${RAW}/platform` : '/platform';

const api = axios.create({ baseURL: PLATFORM_BASE, timeout: 30000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ownerToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !location.pathname.endsWith('/login')) {
      localStorage.removeItem('ownerToken');
      location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ── Endpoints ──
export const Platform = {
  login: (email, password) => api.post('/login', { email, password }),
  me: () => api.get('/me'),
  overview: () => api.get('/overview'),
  analytics: () => api.get('/analytics'),

  listTenants: () => api.get('/tenants'),
  getTenant: (slug) => api.get(`/tenants/${slug}`),
  createTenant: (body) => api.post('/tenants', body),
  updateTenant: (slug, body) => api.patch(`/tenants/${slug}`, body),
  updateSecrets: (slug, body) => api.put(`/tenants/${slug}/secrets`, body),
  setAdminPhone: (slug, phone) => api.put(`/tenants/${slug}/admin-phone`, { phone }),
  archiveTenant: (slug) => api.delete(`/tenants/${slug}`),

  listPlans: () => api.get('/plans'),
  upsertPlan: (body) => api.post('/plans', body),
  setSubscription: (slug, body) => api.put(`/tenants/${slug}/subscription`, body),

  listBuilds: (slug) => api.get('/builds', { params: slug ? { slug } : {} }),
  requestBuild: (slug, body) => api.post(`/tenants/${slug}/builds`, body),
  deleteBuild: (id) => api.delete(`/builds/${id}`),
  clearBuilds: (slug) => api.delete('/builds/clear', { params: slug ? { slug } : {} }),
};

export default api;
