# ApnaAstro — Owner Console

Platform-owner control plane for the ApnaAstro multi-tenant SaaS: provision
tenants (branded astrology apps + admin + landing per client), manage
subscriptions & the 14-day free trial, view cross-tenant analytics, and trigger
per-tenant Android builds.

Talks to the backend's `/platform/*` API (owner auth, separate from tenant auth).

## Develop

```bash
npm install
npm run dev        # http://localhost:5273 (proxies /platform → backend :5050)
```

The backend must run with `SAAS_ENABLED=true` and an owner account seeded
(`node scripts/seedOwner.js` in the backend).

## Deploy (Vercel)

- Framework preset: **Vite**
- Build command: `npm run build` · Output dir: `dist`
- Env var: `VITE_API_BASE` = backend origin (no trailing slash), e.g.
  `https://34-93-133-182.sslip.io` (or `https://api.apnaastro.app` once DNS is set).
  Requests then hit `<VITE_API_BASE>/platform/*`.

## Stack

React 18 · Vite · MUI · React Router · Axios. Owner token in `localStorage`.
