import { useEffect, useMemo, useState } from 'react';
import {
  Box, Card, CardContent, Typography, Grid, MenuItem, TextField, CircularProgress,
  ToggleButton, ToggleButtonGroup, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper,
} from '@mui/material';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Legend, CartesianGrid,
} from 'recharts';
import { Platform } from '../api';

const fmtDay = (s) => { const p = (s || '').split('-'); return p.length === 3 ? `${p[2]}/${p[1]}` : s; };
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const delta = (now, prev) => {
  if (!prev && !now) return { pct: 0, up: null };
  if (!prev) return { pct: 100, up: true };
  const pct = Math.round(((now - prev) / prev) * 100);
  return { pct, up: pct >= 0 };
};

function Trend({ now, prev }) {
  const d = delta(now, prev);
  if (d.up === null) return <Typography variant="caption" color="text.secondary">—</Typography>;
  const color = d.pct === 0 ? 'text.secondary' : d.up ? 'success.main' : 'error.main';
  return <Typography variant="caption" sx={{ color, fontWeight: 700 }}>{d.up && d.pct > 0 ? '▲' : d.pct < 0 ? '▼' : ''} {Math.abs(d.pct)}%</Typography>;
}

export default function Analytics() {
  const [days, setDays] = useState(30);
  const [growth, setGrowth] = useState(null);
  const [consult, setConsult] = useState(null);
  const [scorecard, setScorecard] = useState(null);
  const [tenant, setTenant] = useState('__platform__'); // which series to chart
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      Platform.growthAnalytics(days).then((r) => r.data.data).catch(() => null),
      Platform.consultAnalytics(days).then((r) => r.data.data).catch(() => null),
      Platform.healthScorecard().then((r) => r.data.data).catch(() => null),
    ]).then(([g, c, s]) => {
      if (cancelled) return;
      setGrowth(g); setConsult(c); setScorecard(s); setLoading(false);
    });
    return () => { cancelled = true; };
  }, [days]);

  // Growth series for the selected scope (platform totals or one tenant).
  const growthRows = useMemo(() => {
    if (!growth) return [];
    const src = tenant === '__platform__'
      ? growth.platform
      : (growth.perTenant.find((t) => t.slug === tenant)?.series || []);
    return (src || []).map((r) => ({ day: fmtDay(r.day), users: r.users, sessions: r.sessions, revenue: r.revenue }));
  }, [growth, tenant]);

  const consultRows = useMemo(() => {
    if (!consult) return { minutes: [], topAstro: [] };
    const pt = tenant === '__platform__'
      ? null
      : consult.perTenant.find((t) => t.slug === tenant);
    if (pt) return { minutes: pt.minutesByType.map((r) => ({ ...r, day: fmtDay(r.day) })), topAstro: pt.topAstro };
    // Platform: sum minutes across tenants by day.
    const map = {};
    for (const t of consult.perTenant) {
      for (const r of t.minutesByType) {
        map[r.day] = map[r.day] || { day: r.day, chat: 0, call: 0, video: 0 };
        map[r.day].chat += r.chat; map[r.day].call += r.call; map[r.day].video += r.video;
      }
    }
    const minutes = Object.values(map).sort((a, b) => a.day.localeCompare(b.day)).map((r) => ({ ...r, day: fmtDay(r.day) }));
    return { minutes, topAstro: [] };
  }, [consult, tenant]);

  const tenantOptions = growth?.perTenant || [];

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
        <Typography variant="h5" fontWeight={800}>Analytics</Typography>
        <Box display="flex" gap={1.5} alignItems="center">
          <TextField select size="small" label="Scope" value={tenant} onChange={(e) => setTenant(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="__platform__">All tenants (platform)</MenuItem>
            {tenantOptions.map((t) => <MenuItem key={t.slug} value={t.slug}>{t.displayName || t.slug}</MenuItem>)}
          </TextField>
          <ToggleButtonGroup size="small" exclusive value={days} onChange={(e, v) => v && setDays(v)}>
            <ToggleButton value={7}>7d</ToggleButton>
            <ToggleButton value={30}>30d</ToggleButton>
            <ToggleButton value={90}>90d</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Growth trends, consultation &amp; earnings, and a per-tenant health scorecard.
      </Typography>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress /></Box>
      ) : (
        <>
          {/* ── Growth trends ── */}
          <Grid container spacing={2} mb={1}>
            <Grid item xs={12} md={6}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Revenue / day</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growthRows}>
                    <defs><linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1C9963" stopOpacity={0.4} /><stop offset="100%" stopColor="#1C9963" stopOpacity={0} />
                    </linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" fontSize={11} minTickGap={24} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => inr(v)} contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#1C9963" strokeWidth={2} fill="url(#g-rev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>New users &amp; sessions / day</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={growthRows}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" fontSize={11} minTickGap={24} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="users" name="New users" stroke="#7c4dff" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#26c6da" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
          </Grid>

          {/* ── Consultation minutes by type ── */}
          <Grid container spacing={2} mb={1}>
            <Grid item xs={12} md={consultRows.topAstro.length ? 8 : 12}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Consultation minutes / day (by type)</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={consultRows.minutes}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" fontSize={11} minTickGap={24} />
                    <YAxis fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Legend />
                    <Bar dataKey="chat" stackId="m" fill="#26c6da" name="Chat" />
                    <Bar dataKey="call" stackId="m" fill="#7c4dff" name="Call" />
                    <Bar dataKey="video" stackId="m" fill="#ffb300" name="Video" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
            {consultRows.topAstro.length > 0 && (
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%' }}><CardContent>
                  <Typography variant="subtitle2" fontWeight={700} mb={1}>Top-earning astrologers</Typography>
                  {consultRows.topAstro.map((a, i) => (
                    <Box key={i} display="flex" justifyContent="space-between" py={0.5}>
                      <Typography variant="body2">#{i + 1} · {a.sessions} sessions</Typography>
                      <Chip size="small" label={inr(a.earnings)} />
                    </Box>
                  ))}
                </CardContent></Card>
              </Grid>
            )}
          </Grid>

          {/* ── Tenant health scorecard ── */}
          <Card><CardContent>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Tenant health scorecard (this week vs last)</Typography>
            <Paper variant="outlined" sx={{ overflow: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Tenant</TableCell>
                    <TableCell align="right">Active users (7d)</TableCell>
                    <TableCell align="right">Sessions</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="right">Online astro</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(scorecard?.rows || []).map((r) => (
                    <TableRow key={r.slug}>
                      <TableCell><b>{r.displayName || r.slug}</b></TableCell>
                      <TableCell align="right">{r.activeUsers}</TableCell>
                      <TableCell align="right">{r.sessionsThisWeek} <Trend now={r.sessionsThisWeek} prev={r.sessionsLastWeek} /></TableCell>
                      <TableCell align="right">{inr(r.revenueThisWeek)} <Trend now={r.revenueThisWeek} prev={r.revenueLastWeek} /></TableCell>
                      <TableCell align="right">{r.activeAstrologers}</TableCell>
                      <TableCell><Chip size="small" label={r.subStatus || r.status}
                        color={r.subStatus === 'active' ? 'success' : r.subStatus === 'trialing' ? 'info' : r.subStatus === 'suspended' ? 'error' : 'default'} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </CardContent></Card>
        </>
      )}
    </Box>
  );
}
