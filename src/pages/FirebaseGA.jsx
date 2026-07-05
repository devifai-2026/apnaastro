import { useEffect, useState, useCallback } from 'react';
import {
  Box, Card, CardContent, Stack, Typography, Button, Chip, Grid, Divider,
  CircularProgress, Alert, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Platform } from '../api';

// GA4 lives on the shared Firebase project (platform-global — one property for
// all tenants), which is why it belongs in the owner console, not per-tenant admin.
const FIREBASE_PROJECT = 'astro-phase-2';
const GA_BASE = `https://console.firebase.google.com/project/${FIREBASE_PROJECT}/analytics`;
const RANGES = [
  { key: '7daysAgo', label: '7d' },
  { key: '28daysAgo', label: '28d' },
  { key: '90daysAgo', label: '90d' },
];
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function FirebaseGA() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [start, setStart] = useState('28daysAgo');
  const open = (url) => window.open(url, '_blank', 'noopener,noreferrer');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: res } = await Platform.gaAnalytics({ startDate: start, endDate: 'today' });
      setData(res.data);
    } catch { setData(null); } finally { setLoading(false); }
  }, [start]);
  useEffect(() => { load(); }, [load]);

  const configured = data?.configured;

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} mb={1}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Firebase Analytics (GA4)</Typography>
          <Typography variant="body2" color="text.secondary">Live app usage &amp; engagement across all tenant apps — from Google Analytics.</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <ToggleButtonGroup size="small" exclusive value={start} onChange={(e, v) => v && setStart(v)}>
            {RANGES.map((r) => <ToggleButton key={r.key} value={r.key}>{r.label}</ToggleButton>)}
          </ToggleButtonGroup>
          <Button variant="outlined" size="small" startIcon={<OpenInNewIcon />} onClick={() => open(`${GA_BASE}/app/dashboard`)}>Open GA</Button>
        </Stack>
      </Box>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', height: 280 }}><CircularProgress /></Box>
      ) : !configured ? (
        <Stack spacing={2}>
          <Alert severity="info">Native GA charts aren’t connected yet. Set <code>GA4_PROPERTY_ID</code> on the backend + grant the service account Viewer access to the GA4 property.</Alert>
          <Card><CardContent>
            <Typography fontWeight={700} mb={1}>To connect GA4</Typography>
            <Stack component="ol" spacing={1} sx={{ pl: 2.5, m: 0 }}>
              <li>GA4 → Admin → <b>Property Settings</b> → copy the numeric <b>Property ID</b>.</li>
              <li>GA4 → Admin → <b>Property access management</b> → add the backend service-account email with <b>Viewer</b>.</li>
              <li>Set <code>GA4_PROPERTY_ID=&lt;id&gt;</code> on the server + restart.</li>
            </Stack>
            <Button variant="outlined" sx={{ mt: 2 }} startIcon={<OpenInNewIcon />} onClick={() => open(`${GA_BASE}/app/dashboard`)}>Open Firebase Analytics ({FIREBASE_PROJECT})</Button>
          </CardContent></Card>
        </Stack>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 1 }}>
            <Grid item xs={6} md={3}><Kpi label="Active users" value={fmt(data.kpis.activeUsers)} sub={`${fmt(data.kpis.newUsers)} new`} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Live now" value={fmt(data.realtime?.activeUsers)} sub="last 30 min" accent /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Sessions" value={fmt(data.kpis.sessions)} sub={`${data.kpis.avgEngagementSec || 0}s avg`} /></Grid>
            <Grid item xs={6} md={3}><Kpi label="Events" value={fmt(data.kpis.eventCount)} sub={`${fmt(data.kpis.screenPageViews)} screen views`} /></Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Active users &amp; events over time</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={(data.trend || []).map((t) => ({ ...t, day: (t.date || '').slice(5) }))}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="day" fontSize={11} minTickGap={24} />
                    <YAxis yAxisId="l" width={44} fontSize={11} />
                    <YAxis yAxisId="r" orientation="right" width={44} fontSize={11} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Line yAxisId="l" type="monotone" dataKey="activeUsers" name="Active users" stroke="#e0483a" strokeWidth={2} dot={false} />
                    <Line yAxisId="r" type="monotone" dataKey="eventCount" name="Events" stroke="#26c6da" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12} md={5}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Top events</Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={(data.events || []).slice(0, 8)} layout="vertical" margin={{ left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="eventName" width={110} fontSize={11} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Bar dataKey="eventCount" name="Count" fill="#7c4dff" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent></Card>
            </Grid>
            <Grid item xs={12}>
              <Card><CardContent>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Top screens</Typography>
                {(data.screens || []).length === 0
                  ? <Typography variant="body2" color="text.secondary">No screen views in this range</Typography>
                  : (
                    <Stack divider={<Divider />}>
                      {data.screens.map((s, i) => (
                        <Stack key={i} direction="row" alignItems="center" spacing={2} sx={{ py: 0.75 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ width: 22 }}>{i + 1}</Typography>
                          <Typography variant="body2" sx={{ flex: 1, fontWeight: 600 }}>{s.screen}</Typography>
                          <Chip size="small" label={`${fmt(s.views)} views`} />
                        </Stack>
                      ))}
                    </Stack>
                  )}
              </CardContent></Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}

function Kpi({ label, value, sub, accent }) {
  return (
    <Card sx={{ height: '100%' }}><CardContent sx={{ py: 1.75 }}>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontWeight: 700 }}>{label}</Typography>
      <Typography variant="h5" fontWeight={800} mt={0.5} sx={{ color: accent ? 'success.main' : 'text.primary' }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent></Card>
  );
}
