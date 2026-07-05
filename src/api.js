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
  vmMetrics: (hours) => api.get('/vm-metrics', { params: hours ? { hours } : {} }),
  apiMetrics: (hours) => api.get('/api-metrics', { params: hours ? { hours } : {} }),
  cronRuns: (params) => api.get('/cron-runs', { params: params || {} }),
  cronSummary: (tenant) => api.get('/cron-summary', { params: tenant ? { tenant } : {} }),
  netFallback: (days) => api.get('/net-fallback', { params: days ? { days } : {} }),
  healthHistory: (hours) => api.get('/health-history', { params: hours ? { hours } : {} }),

  listTenants: () => api.get('/tenants'),
  getTenant: (slug) => api.get(`/tenants/${slug}`),
  createTenant: (body) => api.post('/tenants', body),
  uploadBranding: (file, kind, slug) => {
    const fd = new FormData();
    fd.append('image', file);
    fd.append('kind', kind);
    if (slug) fd.append('slug', slug);
    return api.post('/branding-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  updateTenant: (slug, body) => api.patch(`/tenants/${slug}`, body),
  updateSecrets: (slug, body) => api.put(`/tenants/${slug}/secrets`, body),
  setAdminPhone: (slug, phone) => api.put(`/tenants/${slug}/admin-phone`, { phone }),
  archiveTenant: (slug) => api.delete(`/tenants/${slug}`),
  suspendTenant: (slug) => api.post(`/tenants/${slug}/suspend`),
  reactivateTenant: (slug) => api.post(`/tenants/${slug}/reactivate`),
  deleteTenant: (slug, confirm) => api.post(`/tenants/${slug}/delete`, { confirm }),

  listPrompts: (slug) => api.get(`/tenants/${slug}/prompts`),
  updatePrompt: (slug, body) => api.put(`/tenants/${slug}/prompts`, body),

  listPlans: () => api.get('/plans'),
  upsertPlan: (body) => api.post('/plans', body),
  billing: () => api.get('/billing'),
  setSubscription: (slug, body) => api.put(`/tenants/${slug}/subscription`, body),
  recordPayment: (slug, body) => api.post(`/tenants/${slug}/payment`, body),

  listLeads: (status) => api.get('/leads', { params: status ? { status } : {} }),
  updateLead: (id, body) => api.patch(`/leads/${id}`, body),

  listBuilds: (slug) => api.get('/builds', { params: slug ? { slug } : {} }),
  requestBuild: (slug, body) => api.post(`/tenants/${slug}/builds`, body),
  buildAll: (body) => api.post('/builds/all', body),
  getKeystore: () => api.get('/keystore'),
  keystoreDownloadUrl: () => `${PLATFORM_BASE}/keystore/download`,
  deleteBuild: (id) => api.delete(`/builds/${id}`),
  clearBuilds: (slug) => api.delete('/builds/clear', { params: slug ? { slug } : {} }),
};

export default api;
