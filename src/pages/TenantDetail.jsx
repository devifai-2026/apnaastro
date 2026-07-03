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
  const [planKey, setPlanKey] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(() => {
    Platform.getTenant(slug).then(({ data }) => setT(data.data)).catch(() => toast.error('Load failed'));
    Platform.listPlans().then(({ data }) => setPlans(data.data)).catch(() => {});
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
  const build = async (app) => {
    try { await Platform.requestBuild(slug, { app, artifact: 'aab' }); toast.success(`Build queued: ${app}`); }
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

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="subtitle1" fontWeight={700}>Android Builds</Typography>
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={() => build('user')}>Build User App</Button>
              <Button variant="contained" color="secondary" onClick={() => build('astrologer')}>Build Astrologer App</Button>
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
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
