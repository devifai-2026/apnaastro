import { useEffect, useRef, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, Chip, CircularProgress, ToggleButton,
  ToggleButtonGroup, Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { Platform, PLATFORM_BASE } from '../api';

// Live "Ready/Down" dot is derived from /healthz on the platform origin.
// PLATFORM_BASE ends in /platform; strip it to hit the root health probe.
const HEALTH_URL = `${PLATFORM_BASE.replace(/\/platform$/, '')}/healthz`;
const POLL_MS = 5000; // live status-dot poll cadence

const fmtDay = (s) => { const [, m, d] = s.split('-'); return `${d}/${m}`; };

export default function NetworkHealth() {
  // ── Live "Ready/Down" dot + latest latency (the graphs come from the server
  //    health-history below; this is just the at-a-glance current state). ──
  const [status, setStatus] = useState('checking'); // 'up' | 'down' | 'checking'
  const [lastMs, setLastMs] = useState(null);
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
      setStatus(up ? 'up' : 'down');
      setLastMs(up ? Math.round(performance.now() - t0) : null);
    };
    ping();
    timer.current = setInterval(ping, POLL_MS);
    return () => { cancelled = true; clearInterval(timer.current); };
  }, []);

  // ── Backend health HISTORY (up/down + response time over time, from the
  //    server-side health sampler). This is the persisted series behind the
  //    graphs — not the flickering live number. ──
  const [hh, setHh] = useState(null);
  const [hhHours, setHhHours] = useState(3);
  useEffect(() => {
    let cancelled = false;
    const load = () => Platform.healthHistory(hhHours).then(({ data }) => { if (!cancelled) setHh(data.data); }).catch(() => {});
    load();
    const iv = setInterval(load, 30000); // refresh the series every 30s
    return () => { cancelled = true; clearInterval(iv); };
  }, [hhHours]);

  // Recharts rows for the two health charts.
  const healthRows = (hh?.series || []).map((p) => ({
    time: new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    up: p.up,          // 1 = Ready, 0 = Down
    ms: p.ms,          // response time
  }));

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
            <Typography variant="overline" color="text.secondary">Uptime (last {hhHours}h)</Typography>
            <Typography variant="h5" fontWeight={800} mt={1}>{hh?.uptimePct != null ? `${hh.uptimePct}%` : '—'}</Typography>
            <Typography variant="caption" color="text.secondary">{hh?.samples || 0} health samples</Typography>
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

      {/* ── Service up/down + response time over time (health sampler series) ── */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="h6" fontWeight={800}>Service status over time</Typography>
        <ToggleButtonGroup size="small" exclusive value={hhHours} onChange={(e, v) => v && setHhHours(v)}>
          <ToggleButton value={3}>3h</ToggleButton>
          <ToggleButton value={24}>24h</ToggleButton>
          <ToggleButton value={168}>7d</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={2} mb={2}>
        {/* Up / Down */}
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Service up / down</Typography>
            {healthRows.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={healthRows}>
                  <defs>
                    <linearGradient id="g-up" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1C9963" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="#1C9963" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" stroke="#888" fontSize={11} minTickGap={28} />
                  <YAxis stroke="#888" fontSize={11} domain={[0, 1]} ticks={[0, 1]}
                    tickFormatter={(v) => (v === 1 ? 'Up' : 'Down')} width={44} />
                  <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }}
                    formatter={(v) => (v === 1 ? 'Ready' : 'Down')} />
                  {/* step = the service holds a state between checks */}
                  <Area type="stepAfter" dataKey="up" stroke="#1C9963" strokeWidth={2} fill="url(#g-up)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 220, display: 'grid', placeItems: 'center' }}>
                {hh ? <Typography variant="caption" color="text.secondary">Collecting samples… check back in a minute</Typography> : <CircularProgress size={24} />}
              </Box>
            )}
          </CardContent></Card>
        </Grid>
        {/* Response time */}
        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Response time (ms)</Typography>
            {healthRows.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={healthRows}>
                  <defs>
                    <linearGradient id="g-ms" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c4dff" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#7c4dff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="time" stroke="#888" fontSize={11} minTickGap={28} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} formatter={(v) => `${v} ms`} />
                  <Area type="monotone" dataKey="ms" stroke="#7c4dff" strokeWidth={2} fill="url(#g-ms)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ height: 220, display: 'grid', placeItems: 'center' }}>
                {hh ? <Typography variant="caption" color="text.secondary">Collecting samples…</Typography> : <CircularProgress size={24} />}
              </Box>
            )}
            {hh?.latest && (
              <Typography variant="caption" color="text.secondary">Latest: {hh.latest.ms} ms · {hh.latest.up ? 'Ready' : 'Down'}</Typography>
            )}
          </CardContent></Card>
        </Grid>
      </Grid>

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
