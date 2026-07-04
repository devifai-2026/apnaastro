import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
  Stack, MenuItem, TextField, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { Platform } from '../api';

const COLOR = { queued: 'default', running: 'info', succeeded: 'success', failed: 'error', cancelled: 'warning' };

export default function Builds() {
  const [builds, setBuilds] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [sel, setSel] = useState({ slug: '', app: 'user', artifact: 'aab' });
  const [busy, setBusy] = useState(false);

  const load = () => {
    Platform.listBuilds().then(({ data }) => setBuilds(Array.isArray(data?.data) ? data.data : [])).catch(() => setBuilds([]));
  };
  useEffect(() => {
    load();
    Platform.listTenants().then(({ data }) => {
      const ts = (data.data || []).filter((t) => t.status === 'active');
      setTenants(ts);
      if (ts[0]) setSel((s) => ({ ...s, slug: s.slug || ts[0].slug }));
    }).catch(() => {});
  }, []);

  const buildOne = async () => {
    if (!sel.slug) { toast.error('Pick a tenant'); return; }
    setBusy(true);
    try { await Platform.requestBuild(sel.slug, { app: sel.app, artifact: sel.artifact }); toast.success(`Build queued: ${sel.slug} · ${sel.app} · ${sel.artifact.toUpperCase()}`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const buildAll = async () => {
    if (!confirm(`Build ${sel.artifact.toUpperCase()} for BOTH apps of ALL active tenants? This queues many CI builds.`)) return;
    setBusy(true);
    try { const { data } = await Platform.buildAll({ artifact: sel.artifact }); toast.success(`Queued ${data.data.queued}/${data.data.total} builds`); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
    finally { setBusy(false); }
  };
  const del = async (id) => { try { await Platform.deleteBuild(id); load(); } catch (e) { toast.error('Failed'); } };
  const clearPending = async () => {
    if (!confirm('Clear ALL pending (queued/running) builds across all tenants?')) return;
    try { const { data } = await Platform.clearBuilds(); toast.success(`Cleared ${data.data.cleared}`); load(); } catch (e) { toast.error('Failed'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Android Builds</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
        <Button color="warning" onClick={clearPending}>Clear pending</Button>
      </Box>

      {/* Build console: pick a tenant + app + artifact, or build all. */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>Trigger a build</Typography>
        <Divider sx={{ mb: 2 }} />
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField select size="small" label="Tenant" value={sel.slug} onChange={(e) => setSel({ ...sel, slug: e.target.value })} sx={{ minWidth: 180 }}>
            {tenants.map((t) => <MenuItem key={t.slug} value={t.slug}>{t.displayName} ({t.slug})</MenuItem>)}
            {!tenants.length && <MenuItem value="" disabled>No active tenants</MenuItem>}
          </TextField>
          <TextField select size="small" label="App" value={sel.app} onChange={(e) => setSel({ ...sel, app: e.target.value })} sx={{ minWidth: 140 }}>
            <MenuItem value="user">User app</MenuItem>
            <MenuItem value="astrologer">Astrologer app</MenuItem>
          </TextField>
          <TextField select size="small" label="Artifact" value={sel.artifact} onChange={(e) => setSel({ ...sel, artifact: e.target.value })} sx={{ minWidth: 130 }}>
            <MenuItem value="aab">AAB (Play)</MenuItem>
            <MenuItem value="apk">APK</MenuItem>
          </TextField>
          <Button variant="contained" disabled={busy} onClick={buildOne}>Build this</Button>
          <Button variant="outlined" disabled={busy} onClick={buildAll}>Build all tenants</Button>
        </Stack>
      </Paper>

      <Paper>
        <Table>
          <TableHead><TableRow>
            <TableCell>Tenant</TableCell><TableCell>App</TableCell><TableCell>Type</TableCell>
            <TableCell>Version</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell>
            <TableCell>Download</TableCell><TableCell />
          </TableRow></TableHead>
          <TableBody>
            {builds.map((b) => (
              <TableRow key={b._id}>
                <TableCell><b>{b.tenantSlug}</b></TableCell>
                <TableCell>{b.app}</TableCell>
                <TableCell>{(b.artifact || '').toUpperCase()}</TableCell>
                <TableCell>{b.versionName ? `${b.versionName} (${b.versionCode})` : '—'}</TableCell>
                <TableCell><Chip size="small" color={COLOR[b.status] || 'default'} label={b.status} /></TableCell>
                <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                <TableCell>{b.artifactUrl ? <a href={b.artifactUrl} target="_blank" rel="noreferrer">Download</a> : (b.status === 'failed' ? '—' : 'building…')}</TableCell>
                <TableCell><Button size="small" color="error" onClick={() => del(b._id)}>Delete</Button></TableCell>
              </TableRow>
            ))}
            {!builds.length && (
              <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No builds yet — trigger one above.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
