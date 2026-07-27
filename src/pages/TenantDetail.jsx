import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Stack, Divider, MenuItem,
  TextField, Table, TableBody, TableRow, TableCell, IconButton, InputAdornment, Tooltip,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import toast from 'react-hot-toast';
import { Platform } from '../api';
import PurgeTenantDialog from '../components/PurgeTenantDialog';
import ImageUpload from '../components/ImageUpload';

// Control-plane secrets the PO can set/rotate (matches backend updateSecrets allow-list).
const SECRET_KEYS = [
  'dbUri', 'agoraAppId', 'agoraAppCertificate',
  // Agora's RESTful API key/secret — SEPARATE from the App ID + Certificate
  // above. Cloud recording authenticates with these, so without them every
  // call is stamped "mock" and shows as "Not recorded".
  'agoraCustomerId', 'agoraCustomerSecret',
  'payuKey', 'payuSalt',
  'waBridgeAppKey', 'waBridgeAuthKey', 'waBridgeDeviceId', 'waBridgeOtpTemplateId', 'llmApiKey',
  'vedicAstroApiKey',
  // Verifies that a Cashfree webhook genuinely came from Cashfree. Without it
  // the callback still re-queries their API before crediting, so this is
  // defence-in-depth rather than the only gate.
  'cashfreeWebhookSecret',
];

// The current stored value for a secret key. Control-plane secrets live in
// t.secrets; Agora/PayU/VedicAstro are seeded into the tenant-DB config, so read those too.
function currentSecret(t, k) {
  return (t.secrets && t.secrets[k])
    || (k === 'agoraAppId' && t.config?.agora?.appId)
    || (k === 'agoraAppCertificate' && t.config?.agora?.appCertificate)
    || (k === 'agoraCustomerId' && t.config?.agora?.restKey)
    || (k === 'agoraCustomerSecret' && t.config?.agora?.restSecret)
    || (k === 'payuKey' && t.config?.payments?.payu?.key)
    || (k === 'payuSalt' && t.config?.payments?.payu?.salt)
    || (k === 'vedicAstroApiKey' && t.config?.vedicAstro)
    || (k === 'cashfreeWebhookSecret' && t.config?.payments?.cashfree?.webhookSecret)
    || '';
}

// ARGB '#AARRGGBB' (app token format) → CSS '#RRGGBB' for a swatch.
function argbToCss(v) {
  const s = String(v || '').replace('#', '');
  return s.length === 8 ? `#${s.slice(2)}` : (v || '#000');
}

// Small label/value row (defined at module scope so it isn't re-created per render).
function Row({ label, value }) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <Typography sx={{ minWidth: 150, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ wordBreak: 'break-all' }}><code>{value}</code></Typography>
    </Box>
  );
}

export default function TenantDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState(null);
  const [plans, setPlans] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [planKey, setPlanKey] = useState('');
  const [status, setStatus] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [secretEdits, setSecretEdits] = useState({}); // live edit buffer, pre-filled with real values
  // Control-plane branding images. Separate from `t.config` (which mirrors the
  // TENANT DB) because the Android build reads these from the control plane.
  const [brand, setBrand] = useState({ appIconUrl: '', logoUrl: '' });
  const [savedBrand, setSavedBrand] = useState({ appIconUrl: '', logoUrl: '' });
  const [savingBrand, setSavingBrand] = useState(false);
  const brandDirty = brand.appIconUrl !== savedBrand.appIconUrl || brand.logoUrl !== savedBrand.logoUrl;
  const [origSecrets, setOrigSecrets] = useState({}); // loaded values, to detect what changed
  const [purgeOpen, setPurgeOpen] = useState(false); // delete-tenant confirm dialog

  const load = useCallback(() => {
    Platform.getTenant(slug).then(({ data }) => setT(data.data)).catch(() => toast.error('Load failed'));
    Platform.listPlans().then(({ data }) => setPlans(data.data)).catch(() => {});
    Platform.listBuilds(slug).then(({ data }) => setBuilds(data.data)).catch(() => {});
  }, [slug]);
  useEffect(() => { load(); }, [load]);

  // When the tenant loads, pre-fill the secret fields with their ACTUAL values
  // (so the PO can read/copy/edit them) and remember the originals for diffing.
  useEffect(() => {
    if (!t) return;
    const vals = {};
    SECRET_KEYS.forEach((k) => { vals[k] = String(currentSecret(t, k) || ''); });
    setSecretEdits(vals);
    setOrigSecrets(vals);
    // Hydrate the branding editor from the control-plane record (the source the
    // Android build actually reads).
    const b = {
      appIconUrl: (t.branding && t.branding.appIconUrl) || '',
      logoUrl: (t.branding && t.branding.logoUrl) || '',
    };
    setBrand(b);
    setSavedBrand(b);
  }, [t]);

  if (!t) return null;
  const sub = t.subscription;

  // PATCH /tenants/:slug replaces `branding` WHOLESALE, so spread the existing
  // object first — sending only the two image URLs would wipe displayName,
  // tagline and the theme colours.
  const saveBranding = async () => {
    setSavingBrand(true);
    try {
      const next = {
        ...(t.branding || {}),
        appIconUrl: brand.appIconUrl || undefined,
        logoUrl: brand.logoUrl || undefined,
      };
      await Platform.updateTenant(slug, { branding: next });
      setSavedBrand({ appIconUrl: brand.appIconUrl, logoUrl: brand.logoUrl });
      toast.success('Branding saved — rebuild to apply the icon');
      load();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Could not save branding');
    } finally {
      setSavingBrand(false);
    }
  };

  const applyPlan = async () => {
    if (!planKey) return;
    try { await Platform.setSubscription(slug, { planKey, periodDays: 30, payment: { amount: 0, method: 'manual' } }); toast.success('Plan applied'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const applyStatus = async () => {
    if (!status) return;
    try { await Platform.setSubscription(slug, { status }); toast.success(`Status → ${status}`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const build = async (app, artifact) => {
    try { await Platform.requestBuild(slug, { app, artifact }); toast.success(`Build queued: ${app} ${artifact.toUpperCase()}`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const deleteBuild = async (id) => {
    try { await Platform.deleteBuild(id); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const clearBuilds = async () => {
    if (!confirm('Cancel/clear all pending (queued/running) builds for this tenant?')) return;
    try { const { data } = await Platform.clearBuilds(slug); toast.success(`Cleared ${data.data.cleared} pending build(s)`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const saveAdminPhone = async () => {
    if (!adminPhone.trim()) return;
    try { await Platform.setAdminPhone(slug, adminPhone.trim()); toast.success('Admin phone set — they can log into the admin console'); setAdminPhone(''); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const saveSecrets = async () => {
    // Send only the fields whose value actually changed from what was loaded.
    const patch = Object.fromEntries(
      Object.entries(secretEdits).filter(([k, v]) => (v || '') !== (origSecrets[k] || '')),
    );
    if (!Object.keys(patch).length) { toast('No changes to save'); return; }
    try { await Platform.updateSecrets(slug, patch); toast.success(`Updated ${Object.keys(patch).length} secret(s)`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const copySecret = async (k) => {
    try { await navigator.clipboard.writeText(secretEdits[k] || ''); toast.success(`${k} copied`); }
    catch { toast.error('Copy failed'); }
  };
  // Disable build buttons for an app while a build is queued/running for it.
  const pendingApps = new Set(builds.filter((b) => b.status === 'queued' || b.status === 'running').map((b) => b.app));
  const suspend = async () => {
    if (!confirm(`Suspend ${slug}? ALL logins (users, admins, astrologers) will be blocked immediately. Data is kept and you can reactivate anytime.`)) return;
    try { await Platform.suspendTenant(slug); toast.success('Suspended — all logins blocked'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const reactivate = async () => {
    try { await Platform.reactivateTenant(slug); toast.success('Reactivated — logins work again'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <Box sx={{ maxWidth: 900 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>{t.displayName} <Chip label={t.slug} size="small" /></Typography>
        <Chip label={t.status} color={t.status === 'active' ? 'success' : 'default'} />
      </Box>

      {/* Tenant-facing URLs — landing page + admin console. */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700}>URLs</Typography>
        <Divider sx={{ my: 1.5 }} />
        <Stack spacing={1}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography sx={{ minWidth: 130, color: 'text.secondary' }}>Landing page</Typography>
            {t.urls?.landing
              ? <a href={t.urls.landing} target="_blank" rel="noreferrer">{t.urls.landing}</a>
              : <Typography color="text.secondary">—</Typography>}
          </Box>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Typography sx={{ minWidth: 130, color: 'text.secondary' }}>Admin console</Typography>
            {t.urls?.admin
              ? <a href={t.urls.admin} target="_blank" rel="noreferrer">{t.urls.admin}</a>
              : <Typography color="text.secondary">—</Typography>}
          </Box>
        </Stack>
        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Admin login phones — these numbers (all super-admins in the tenant DB) can log into the admin console via OTP.
        </Typography>
        {t.adminPhones && t.adminPhones.length > 0 ? (
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
            {t.adminPhones.map((p) => <Chip key={p} label={p} size="small" color={p === t.adminPhone ? 'primary' : 'default'} variant={p === t.adminPhone ? 'filled' : 'outlined'} />)}
          </Stack>
        ) : <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>None set yet.</Typography>}
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Add / set admin phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit" inputProps={{ inputMode: 'numeric', pattern: '[0-9]*', maxLength: 10 }} sx={{ minWidth: 200 }} />
          <Button variant="outlined" onClick={saveAdminPhone}>Add admin</Button>
        </Stack>
      </Paper>

      {/* Brand + tenant-DB config summary (theme colours, payments, VedicAstro, Agora). */}
      {t.config && (
        <Paper sx={{ p: 2.5, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700}>Brand & config</Typography>
          <Divider sx={{ my: 1.5 }} />
          <Stack spacing={1}>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography sx={{ minWidth: 150, color: 'text.secondary' }}>Theme</Typography>
              {t.config.theme?.enabled ? (
                <>
                  <Chip size="small" label="enabled" color="success" />
                  {t.config.theme.primary && <Box sx={{ width: 20, height: 20, borderRadius: 1, border: '1px solid #333', background: argbToCss(t.config.theme.primary) }} title={`primary ${t.config.theme.primary}`} />}
                  {t.config.theme.accent && <Box sx={{ width: 20, height: 20, borderRadius: 1, border: '1px solid #333', background: argbToCss(t.config.theme.accent) }} title={`accent ${t.config.theme.accent}`} />}
                  <Typography variant="caption" color="text.secondary">{t.config.theme.primary} / {t.config.theme.accent}</Typography>
                </>
              ) : <Chip size="small" label="not set (using app default)" />}
            </Box>
            <Row label="App name" value={t.config.appName || '—'} />
            <Row label="Logo" value={t.config.logoUrl || '—'} />
            <Row label="Active gateway" value={t.config.payments?.active || '—'} />
            <Row label="PayU" value={t.config.payments?.payu?.key || '—'} />
            <Row label="Razorpay" value={t.config.payments?.razorpay?.keyId || '—'} />
            <Row label="Cashfree" value={t.config.payments?.cashfree?.appId || '—'} />
            <Row label="VedicAstro key" value={t.config.vedicAstro || '—'} />
            <Row label="Agora App ID" value={t.config.agora?.appId || '—'} />
          </Stack>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            These live in the tenant's own database (editable in the tenant admin). Masked values shown.
          </Typography>
        </Paper>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Subscription</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Typography>Status: <b>{sub?.status || '—'}</b></Typography>
            {sub?.trialEndsAt && <Typography variant="body2" color="text.secondary">Trial ends: {new Date(sub.trialEndsAt).toLocaleDateString()}</Typography>}
            {sub?.currentPeriodEnd && <Typography variant="body2" color="text.secondary">Period ends: {new Date(sub.currentPeriodEnd).toLocaleDateString()}</Typography>}
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField select size="small" label="Assign plan" value={planKey} onChange={(e) => setPlanKey(e.target.value)} sx={{ minWidth: 140 }}>
                {plans.map((p) => <MenuItem key={p.key} value={p.key}>{p.name}</MenuItem>)}
              </TextField>
              <Button variant="outlined" onClick={applyPlan}>Apply</Button>
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <TextField select size="small" label="Set status" value={status} onChange={(e) => setStatus(e.target.value)} sx={{ minWidth: 140 }}>
                {['active', 'past_due', 'suspended', 'cancelled'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
              <Button variant="outlined" color="warning" onClick={applyStatus}>Set</Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Secrets (encrypted)</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              Actual values shown — copy or edit any field, then Save. Only changed
              fields are updated. Agora &amp; PayU also live in the tenant DB (edit here or in the tenant admin).
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Stack spacing={1.5}>
              {SECRET_KEYS.map((k) => {
                const val = secretEdits[k] ?? '';
                const changed = (val || '') !== (origSecrets[k] || '');
                return (
                  <TextField
                    key={k}
                    size="small"
                    label={k}
                    placeholder="not set"
                    value={val}
                    onChange={(e) => setSecretEdits((s) => ({ ...s, [k]: e.target.value }))}
                    fullWidth
                    color={changed ? 'warning' : undefined}
                    focused={changed || undefined}
                    helperText={changed ? 'changed — will be saved' : undefined}
                    InputProps={{
                      endAdornment: val ? (
                        <InputAdornment position="end">
                          <Tooltip title="Copy">
                            <IconButton size="small" edge="end" onClick={() => copySecret(k)}>
                              <ContentCopyIcon fontSize="inherit" />
                            </IconButton>
                          </Tooltip>
                        </InputAdornment>
                      ) : undefined,
                    }}
                  />
                );
              })}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              <Button variant="contained" onClick={saveSecrets}>Save changes</Button>
              <Button variant="text" onClick={() => setSecretEdits(origSecrets)}>Reset</Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>Android Builds</Typography>
              <Button size="small" onClick={load}>Refresh</Button>
              <Button size="small" color="warning" onClick={clearBuilds}>Clear pending</Button>
            </Box>
            <Divider sx={{ mb: 1.5 }} />

            {/* Launcher icon + logo, EDITABLE here.
                The CI workflow stamps the home-screen icon from branding.appIconUrl
                and skips that step when it is empty, keeping the checked-in default
                — which is why a tenant created without an icon builds with the
                generic one and there was previously no way to fix it: the create
                form had the upload, but this page only ever displayed the logo
                read-only. Set it here, then rebuild. */}
            <Stack spacing={1.5} sx={{ mb: 2 }}>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                <ImageUpload
                  label="App icon (1024×1024 PNG)"
                  hint="Home-screen icon. Applied on the next build."
                  kind="icon"
                  slug={slug}
                  value={brand.appIconUrl}
                  onChange={(url) => setBrand((b) => ({ ...b, appIconUrl: url }))}
                />
                <ImageUpload
                  label="App logo"
                  hint="Shown inside the app (splash / headers)."
                  kind="logo"
                  slug={slug}
                  value={brand.logoUrl}
                  onChange={(url) => setBrand((b) => ({ ...b, logoUrl: url }))}
                />
              </Stack>
              {brandDirty && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button size="small" variant="contained" onClick={saveBranding} disabled={savingBrand}>
                    {savingBrand ? 'Saving…' : 'Save branding'}
                  </Button>
                  <Typography variant="caption" color="warning.main">
                    Unsaved — save before building, or the build uses the old icon.
                  </Typography>
                </Stack>
              )}
              {!brand.appIconUrl && (
                <Typography variant="caption" color="text.secondary">
                  No app icon set — builds will use the default launcher icon.
                </Typography>
              )}
            </Stack>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {/* Buttons for an app are disabled while a build for it is queued/running. */}
              <Button size="small" variant="contained" disabled={pendingApps.has('user')} onClick={() => build('user', 'aab')}>User · AAB (Play)</Button>
              <Button size="small" variant="outlined" disabled={pendingApps.has('user')} onClick={() => build('user', 'apk')}>User · APK</Button>
              <Button size="small" variant="contained" color="secondary" disabled={pendingApps.has('astrologer')} onClick={() => build('astrologer', 'aab')}>Astrologer · AAB</Button>
              <Button size="small" variant="outlined" color="secondary" disabled={pendingApps.has('astrologer')} onClick={() => build('astrologer', 'apk')}>Astrologer · APK</Button>
            </Stack>
            {pendingApps.size > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                A build is in progress for: {[...pendingApps].join(', ')} — buttons re-enable when it finishes.
              </Typography>
            )}
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>App</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Download</TableCell>
                  <TableCell />
                </TableRow>
                {builds.map((bd) => (
                  <TableRow key={bd._id}>
                    <TableCell>{bd.app}</TableCell>
                    <TableCell>{(bd.artifact || '').toUpperCase()}</TableCell>
                    <TableCell>{bd.versionName ? `${bd.versionName} (${bd.versionCode})` : '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={bd.status}
                        color={{ succeeded: 'success', failed: 'error', running: 'info', queued: 'default' }[bd.status] || 'default'} />
                    </TableCell>
                    <TableCell>
                      {bd.artifactUrl
                        ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <a href={bd.artifactUrl} target="_blank" rel="noreferrer">Download {(bd.artifact || '').toUpperCase()}</a>
                            <Button size="small" sx={{ minWidth: 0 }} onClick={async () => { try { await navigator.clipboard.writeText(bd.artifactUrl); toast.success('Download URL copied'); } catch { toast.error('Copy failed'); } }}>Copy URL</Button>
                          </Stack>
                        )
                        : (bd.status === 'failed' ? '—' : 'building…')}
                    </TableCell>
                    <TableCell><Button size="small" color="error" onClick={() => deleteBuild(bd._id)}>Delete</Button></TableCell>
                  </TableRow>
                ))}
                {!builds.length && (
                  <TableRow><TableCell colSpan={6} sx={{ color: 'text.secondary' }}>No builds yet — queue one above.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5, border: '1px solid', borderColor: 'error.main' }}>
            <Typography variant="subtitle1" fontWeight={700} color="error">Danger zone</Typography>
            <Divider sx={{ my: 1.5 }} />

            {/* Suspend / Reactivate — reversible, blocks ALL logins */}
            <Box sx={{ mb: 2.5 }}>
              <Typography variant="body2" fontWeight={600}>Suspend workspace</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Instantly blocks ALL logins (users, admins, astrologers). Data is kept; reversible.
                {t.status === 'archived' && ' — currently SUSPENDED.'}
                {t.status === 'deleted' && ' — permanently DELETED.'}
              </Typography>
              {t.status === 'archived'
                ? <Button variant="contained" color="success" onClick={reactivate}>Reactivate workspace</Button>
                : <Button variant="outlined" color="warning" onClick={suspend} disabled={t.status === 'deleted'}>Suspend workspace</Button>}
            </Box>

            <Divider sx={{ my: 1.5 }} />

            {/* Delete = hard purge. There is deliberately no soft-delete option:
                a status-only delete keeps the row and leaves the slug taken, which
                is never what an operator wants here. */}
            <Box>
              <Typography variant="body2" fontWeight={600} color="error">Delete permanently</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Drops the tenant database <code>{t.dbName}</code> and removes the record,
                secrets, subscription and build history. Afterwards <b>{slug}</b> is free and
                can be used for a new tenant. No backup — this cannot be undone.
              </Typography>
              <Button variant="contained" color="error" onClick={() => setPurgeOpen(true)}>
                Delete tenant permanently
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* onDone navigates away rather than reloading — after a purge this tenant
          no longer exists, so load() would 404. */}
      <PurgeTenantDialog
        tenant={t}
        open={purgeOpen}
        onClose={() => setPurgeOpen(false)}
        onDone={() => nav('/tenants')}
      />
    </Box>
  );
}
