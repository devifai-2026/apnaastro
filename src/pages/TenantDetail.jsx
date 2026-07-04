import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Grid, Chip, Button, Stack, Divider, MenuItem,
  TextField, Table, TableBody, TableRow, TableCell,
} from '@mui/material';
import toast from 'react-hot-toast';
import { Platform } from '../api';

export default function TenantDetail() {
  const { slug } = useParams();
  const nav = useNavigate();
  const [t, setT] = useState(null);
  const [plans, setPlans] = useState([]);
  const [builds, setBuilds] = useState([]);
  const [planKey, setPlanKey] = useState('');
  const [status, setStatus] = useState('');
  const [adminPhone, setAdminPhone] = useState('');

  const load = useCallback(() => {
    Platform.getTenant(slug).then(({ data }) => setT(data.data)).catch(() => toast.error('Load failed'));
    Platform.listPlans().then(({ data }) => setPlans(data.data)).catch(() => {});
    Platform.listBuilds(slug).then(({ data }) => setBuilds(data.data)).catch(() => {});
  }, [slug]);
  useEffect(load, [load]);

  if (!t) return null;
  const sub = t.subscription;

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
  const saveAdminPhone = async () => {
    if (!adminPhone.trim()) return;
    try { await Platform.setAdminPhone(slug, adminPhone.trim()); toast.success('Admin phone set — they can log into the admin console'); setAdminPhone(''); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };
  const archive = async () => {
    if (!confirm(`Archive ${slug}? Its API will be blocked (data kept).`)) return;
    try { await Platform.archiveTenant(slug); toast.success('Archived'); nav('/tenants'); }
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
          Admin login phone — this number can log into the admin console via OTP.
        </Typography>
        <Stack direction="row" spacing={1}>
          <TextField size="small" label="Admin phone" value={adminPhone} onChange={(e) => setAdminPhone(e.target.value)} placeholder="10-digit" sx={{ minWidth: 200 }} />
          <Button variant="outlined" onClick={saveAdminPhone}>Set / Change</Button>
        </Stack>
      </Paper>

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
            <Typography variant="subtitle1" fontWeight={700}>Secrets (masked)</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Table size="small">
              <TableBody>
                {Object.entries(t.secrets || {}).filter(([, v]) => v).map(([k, v]) => (
                  <TableRow key={k}><TableCell>{k}</TableCell><TableCell><code>{v}</code></TableCell></TableRow>
                ))}
                {!Object.values(t.secrets || {}).some(Boolean) && (
                  <TableRow><TableCell colSpan={2} sx={{ color: 'text.secondary' }}>No secrets set</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>Android Builds</Typography>
              <Button size="small" onClick={load}>Refresh</Button>
            </Box>
            <Divider sx={{ mb: 1.5 }} />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              <Button size="small" variant="contained" onClick={() => build('user', 'aab')}>User · AAB (Play)</Button>
              <Button size="small" variant="outlined" onClick={() => build('user', 'apk')}>User · APK</Button>
              <Button size="small" variant="contained" color="secondary" onClick={() => build('astrologer', 'aab')}>Astrologer · AAB</Button>
              <Button size="small" variant="outlined" color="secondary" onClick={() => build('astrologer', 'apk')}>Astrologer · APK</Button>
            </Stack>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>App</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Download</TableCell>
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
                        ? <a href={bd.artifactUrl} target="_blank" rel="noreferrer">Download {(bd.artifact || '').toUpperCase()}</a>
                        : (bd.status === 'failed' ? '—' : 'building…')}
                    </TableCell>
                  </TableRow>
                ))}
                {!builds.length && (
                  <TableRow><TableCell colSpan={5} sx={{ color: 'text.secondary' }}>No builds yet — queue one above.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </Grid>

        <Grid item xs={12}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700} color="error">Danger</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Button variant="outlined" color="error" onClick={archive}>Archive Tenant</Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
