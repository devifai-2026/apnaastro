import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
  Stack, MenuItem, TextField, Divider,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import KeyIcon from '@mui/icons-material/VpnKey';
import toast from 'react-hot-toast';
import { Platform } from '../api';

const COLOR = { queued: 'default', running: 'info', succeeded: 'success', failed: 'error', cancelled: 'warning' };

export default function Builds() {
  const [builds, setBuilds] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [sel, setSel] = useState({ slug: '', app: 'user', artifact: 'aab' });
  const [busy, setBusy] = useState(false);
  const [keystore, setKeystore] = useState(null);
  const [showPass, setShowPass] = useState(false);

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
    Platform.getKeystore().then(({ data }) => setKeystore(data.data)).catch(() => {});
  }, []);

  const downloadKeystore = () => {
    // Auth header needed → fetch as blob then save (can't use a plain <a href>).
    fetch(Platform.keystoreDownloadUrl(), { headers: { Authorization: `Bearer ${localStorage.getItem('ownerToken')}` } })
      .then((r) => { if (!r.ok) throw new Error(); return r.blob(); })
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = keystore?.filename || 'release.jks'; a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Download failed'));
  };

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

      {/* Platform signing keystore — the single release key all tenant apps are
          signed with. Downloadable so it's never lost (losing it = no Play updates). */}
      <Paper sx={{ p: 2.5, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <KeyIcon fontSize="small" color="primary" />
          <Typography variant="subtitle1" fontWeight={700} sx={{ flexGrow: 1 }}>Release signing keystore</Typography>
          {keystore && <Button size="small" startIcon={<DownloadIcon />} variant="outlined" onClick={downloadKeystore}>Download .jks</Button>}
        </Box>
        <Divider sx={{ mb: 1.5 }} />
        {keystore ? (
          <Stack spacing={0.75}>
            <Typography variant="body2"><b>Status:</b> all release builds are signed with this platform keystore (Play-ready).</Typography>
            <Typography variant="body2" color="text.secondary"><b>Alias:</b> {keystore.alias} · <b>File:</b> {keystore.filename}</Typography>
            {keystore.sha256 && <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}><b>SHA-256:</b> {keystore.sha256}</Typography>}
            {keystore.validUntil && <Typography variant="caption" color="text.secondary"><b>Valid until:</b> {new Date(keystore.validUntil).toLocaleDateString()}</Typography>}
            <Box sx={{ mt: 0.5 }}>
              <Button size="small" onClick={() => setShowPass((v) => !v)}>{showPass ? 'Hide' : 'Show'} passwords</Button>
              {showPass && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  store: <code>{keystore.storePassword}</code> · key: <code>{keystore.keyPassword}</code>
                </Typography>
              )}
            </Box>
            <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>
              ⚠ Keep a backup. If this keystore is lost you cannot publish updates to any already-published app.
            </Typography>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No platform keystore stored yet — release builds fall back to <b>debug signing</b> (installable, but NOT Play-uploadable).
          </Typography>
        )}
      </Paper>

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
