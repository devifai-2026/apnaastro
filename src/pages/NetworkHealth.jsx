import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, CircularProgress, ToggleButton,
  ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from 'recharts';
import { Platform, PLATFORM_BASE } from '../api';

// Health is derived from /healthz on the platform origin. PLATFORM_BASE ends in
// /platform; strip it to hit the root health probe.
const HEALTH_URL = `${PLATFORM_BASE.replace(/\/platform$/, '')}/healthz`;
const POLL_MS = 5000;         // live health poll cadence
const MAX_POINTS = 120;       // ~10 min of history at 5s

const fmtTime = (d) => new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const fmtDay = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}`; };

export default function NetworkHealth() {
  // ── Live backend health (rolling up/down timeline) ──
  const [status, setStatus] = useState('checking'); // 'up' | 'down' | 'checking'
  const [history, setHistory] = useState([]);        // [{ at, up, ms }]
  const [uptimePct, setUptimePct] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const t0 = performance.now();
      let up = false;
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        up = res.ok;
      } catch { up = false; }
      if (cancelled) return;
      const ms = Math.round(performance.now() - t0);
      const at = Date.now();
      setStatus(up ? 'up' : 'down');
      setHistory((h) => {
        const next = [...h, { at, up: up ? 1 : 0, ms: up ? ms : 0 }].slice(-MAX_POINTS);
        const ups = next.filter((p) => p.up).length;
        setUptimePct(next.length ? Math.round((ups / next.length) * 100) : null);
        return next;
      });
    };
    ping();
    timer.current = setInterval(ping, POLL_MS);
    return () => { cancelled = true; clearInterval(timer.current); };
  }, []);

  // ── Network-fallback impact (how many users hit the DNS issue) ──
  const [days, setDays] = useState(7);
  const [fb, setFb] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Platform.netFallback(days)
      .then((r) => { if (!cancelled) setFb(r.data.data); })
      .catch(() => { if (!cancelled) setFb(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days]);

  const statusColor = status === 'up' ? '#1C9963' : status === 'down' ? '#C0392B' : '#B0855B';
  const lastMs = history.length ? history[history.length - 1].ms : null;

  return (
    <Box>
      <Typography variant="h5" fontWeight={800} gutterBottom>Network Health</Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Live backend status + how many users hit the network/DNS issue (self-healed onto the sslip fallback), by tenant &amp; app.
      </Typography>

      {/* ── Live status ── */}
      <Grid container spacing={2} mb={1}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">Backend status (live)</Typography>
              <Box display="flex" alignItems="center" gap={1.5} mt={1}>
                <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: statusColor,
                  boxShadow: `0 0 0 4px ${statusColor}22`, animation: status === 'checking' ? 'pulse 1s infinite' : 'none' }} />
                <Typography variant="h5" fontWeight={800} sx={{ color: statusColor }}>
                  {status === 'up' ? 'Ready' : status === 'down' ? 'Down' : 'Checking…'}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {lastMs != null ? `${lastMs} ms · ` : ''}checked every {POLL_MS / 1000}s
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Uptime (this session)</Typography>
            <Typography variant="h5" fontWeight={800} mt={1}>{uptimePct != null ? `${uptimePct}%` : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{history.length} checks in the last ~10 min</Typography>
          </CardContent></Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card><CardContent>
            <Typography variant="overline" color="text.secondary">Users impacted ({days}d)</Typography>
            <Typography variant="h5" fontWeight={800} mt={1}>{fb ? fb.total : (loading ? '…' : 0)}</Typography>
            <Typography variant="caption" color="text.secondary">
              {fb ? `user ${fb.byApp.user || 0} · astrologer ${fb.byApp.astrologer || 0}` : 'fallback beacons'}
            </Typography>
          </CardContent></Card>
        </Grid>
      </Grid>

      {/* ── Live up/down strip ── */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={1}>Live up/down (last ~10 min)</Typography>
          <Box display="flex" gap="2px" sx={{ height: 34, alignItems: 'stretch', overflow: 'hidden' }}>
            {history.length === 0 && <Typography variant="caption" color="text.secondary">Collecting…</Typography>}
            {history.map((p, i) => (
              <Box key={i} title={`${fmtTime(p.at)} — ${p.up ? `Ready (${p.ms}ms)` : 'Down'}`}
                sx={{ flex: 1, minWidth: 3, borderRadius: 0.5, bgcolor: p.up ? '#1C9963' : '#C0392B', opacity: 0.9 }} />
            ))}
          </Box>
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            Each bar = one health check. Green = Ready, red = Down. Hover for the timestamp.
          </Typography>
        </CardContent>
      </Card>

      {/* ── Fallback impact ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight={800}>Network-issue impact</Typography>
        <ToggleButtonGroup size="small" exclusive value={days} onChange={(e, v) => v && setDays(v)}>
          <ToggleButton value={1}>24h</ToggleButton>
          <ToggleButton value={7}>7d</ToggleButton>
          <ToggleButton value={30}>30d</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
      ) : !fb || fb.total === 0 ? (
        <Card><CardContent>
          <Typography color="text.secondary">No users hit the network fallback in the last {days === 1 ? '24h' : `${days} days`}. 🎉</Typography>
        </CardContent></Card>
      ) : (
        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card><CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Impacted users per day (by app)</Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={fb.series.map((r) => ({ ...r, day: fmtDay(r.day) }))}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="user" stackId="a" fill="#E0584A" name="User app" />
                  <Bar dataKey="astrologer" stackId="a" fill="#C98A5E" name="Astrologer app" />
                  <Bar dataKey="unknown" stackId="a" fill="#9E9E9E" name="Unknown" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}><CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>By tenant</Typography>
              {fb.byTenant.map((t) => (
                <Box key={t.tenant} display="flex" justifyContent="space-between" py={0.5}>
                  <Typography variant="body2">{t.tenant}</Typography>
                  <Chip size="small" label={t.count} />
                </Box>
              ))}
            </CardContent></Card>
          </Grid>
          <Grid item xs={12}>
            <Card><CardContent>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>Recent events</Typography>
              <Paper variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>When</TableCell><TableCell>Tenant</TableCell>
                      <TableCell>App</TableCell><TableCell>Primary host</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fb.recent.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell>{new Date(e.at).toLocaleString()}</TableCell>
                        <TableCell>{e.tenant}</TableCell>
                        <TableCell><Chip size="small" label={e.app}
                          color={e.app === 'user' ? 'error' : e.app === 'astrologer' ? 'warning' : 'default'} /></TableCell>
                        <TableCell><Typography variant="caption">{e.primaryHost || '—'}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            </CardContent></Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
