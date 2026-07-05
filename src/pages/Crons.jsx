import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
  MenuItem, TextField, Stack, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Platform } from '../api';

const CRON_LABEL = {
  reengagement: 'Re-engagement nudges',
  reminder: 'Scheduled reminders',
  live_nudge: 'Live-join nudges',
  stale_live_sweep: 'Stale-live cleanup',
  marketing: 'Marketing generation',
  horoscope_prewarm: 'Horoscope pre-warm',
};
const ago = (d) => {
  if (!d) return '—';
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function Crons() {
  const [summary, setSummary] = useState({ rows: [], crons: [], tenants: [] });
  const [runs, setRuns] = useState([]);
  const [tenant, setTenant] = useState('');
  const [cron, setCron] = useState('');

  const load = () => {
    Platform.cronSummary(tenant || undefined).then(({ data }) => setSummary(data.data || { rows: [], crons: [], tenants: [] })).catch(() => {});
    const params = {};
    if (tenant) params.tenant = tenant;
    if (cron) params.cron = cron;
    Platform.cronRuns(params).then(({ data }) => setRuns(Array.isArray(data?.data) ? data.data : [])).catch(() => setRuns([]));
  };
  useEffect(load, [tenant, cron]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Cron monitor</Typography>
        <TextField select size="small" label="Tenant" value={tenant} onChange={(e) => setTenant(e.target.value)} sx={{ minWidth: 160 }}>
          <MenuItem value="">All tenants</MenuItem>
          {summary.tenants.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Cron" value={cron} onChange={(e) => setCron(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">All crons</MenuItem>
          {summary.crons.map((c) => <MenuItem key={c} value={c}>{CRON_LABEL[c] || c}</MenuItem>)}
        </TextField>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      {/* Summary grid: latest run per (cron, tenant) + 24h totals */}
      <Paper sx={{ mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>Latest run per cron / tenant</Typography>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Cron</TableCell><TableCell>Tenant</TableCell><TableCell>Last run</TableCell>
            <TableCell align="right">Rows</TableCell><TableCell>Status</TableCell>
            <TableCell align="right">Runs 24h</TableCell><TableCell align="right">Rows 24h</TableCell><TableCell align="right">Fails 24h</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {summary.rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell><b>{CRON_LABEL[r.cron] || r.cron}</b></TableCell>
                <TableCell>{r.tenantSlug}</TableCell>
                <TableCell><Tooltip title={r.lastRanAt ? new Date(r.lastRanAt).toLocaleString() : ''}><span>{ago(r.lastRanAt)}</span></Tooltip></TableCell>
                <TableCell align="right">{r.lastRows == null ? '—' : r.lastRows}</TableCell>
                <TableCell>{r.lastOk ? <Chip size="small" color="success" label="ok" /> : <Tooltip title={r.lastError || ''}><Chip size="small" color="error" label="failed" /></Tooltip>}</TableCell>
                <TableCell align="right">{r.runs24h}</TableCell>
                <TableCell align="right">{r.rows24h}</TableCell>
                <TableCell align="right">{r.fails24h ? <span style={{ color: '#e0483a' }}>{r.fails24h}</span> : 0}</TableCell>
              </TableRow>
            ))}
            {!summary.rows.length && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No cron runs recorded yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      {/* Run history */}
      <Paper>
        <Typography variant="subtitle1" fontWeight={700} sx={{ p: 2, pb: 1 }}>Run history {tenant && `· ${tenant}`}{cron && ` · ${CRON_LABEL[cron] || cron}`}</Typography>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>When</TableCell><TableCell>Cron</TableCell><TableCell>Tenant</TableCell>
            <TableCell align="right">Rows</TableCell><TableCell align="right">Duration</TableCell><TableCell>Status</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {runs.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{new Date(r.ranAt).toLocaleString()}</TableCell>
                <TableCell>{CRON_LABEL[r.cron] || r.cron}</TableCell>
                <TableCell>{r.tenantSlug}</TableCell>
                <TableCell align="right">{r.rowsAffected == null ? '—' : r.rowsAffected}</TableCell>
                <TableCell align="right">{r.durationMs}ms</TableCell>
                <TableCell>{r.ok ? <Chip size="small" color="success" label="ok" /> : <Tooltip title={r.error || ''}><Chip size="small" color="error" label="failed" /></Tooltip>}</TableCell>
              </TableRow>
            ))}
            {!runs.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No runs match the filter.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
