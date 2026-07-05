import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Paper, CircularProgress } from '@mui/material';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';
import { Platform } from '../api';

// Format a metric time-series [{t,v}] into recharts rows with a short time label.
function toSeries(arr) {
  return (arr || []).map((p) => ({
    time: new Date(p.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    v: p.v,
  }));
}

const TILES = [
  { key: 'tenants', label: 'Active Tenants', color: '#7c4dff', from: 'overview' },
  { key: 'trialing', label: 'On Trial', color: '#26c6da', from: 'overview' },
  { key: 'activeSubs', label: 'Paid / Active', color: '#66bb6a', from: 'overview' },
  { key: 'suspended', label: 'Suspended', color: '#ef5350', from: 'overview' },
];
const PIE_COLORS = ['#7c4dff', '#26c6da', '#66bb6a', '#ffb300', '#ef5350', '#8d6e63'];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [rep, setRep] = useState(null);
  const [vm, setVm] = useState(null);
  const [apiM, setApiM] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Platform.overview().then(({ data }) => setStats(data.data)).catch(() => {});
    Platform.analytics()
      .then(({ data }) => setRep(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
    Platform.vmMetrics(3).then(({ data }) => setVm(data.data)).catch(() => {});
    Platform.apiMetrics(24).then(({ data }) => setApiM(data.data)).catch(() => {});
  }, []);

  const subData = rep ? Object.entries(rep.subscriptions || {}).map(([name, value]) => ({ name, value })) : [];
  const tenantBars = rep ? (rep.tenants || []).map((t) => ({
    name: t.slug, users: t.users, sessions: t.sessions, storageMb: t.storageMb,
  })) : [];

  // API observability derived series.
  const apiSeries = (apiM?.series || []).map((r) => ({
    time: new Date(r.bucket?.value || r.bucket).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
    reqs: Number(r.reqs || 0), p95: Number(r.p95 || 0), avg: Number(r.avg_ms || 0),
    errors: Number(r.errs_4xx || 0) + Number(r.errs_5xx || 0),
  }));
  const STATUS_LABEL = { 2: '2xx OK', 3: '3xx', 4: '4xx client', 5: '5xx server' };
  const STATUS_COLOR = { 2: '#2e9e6b', 3: '#26c6da', 4: '#ffb300', 5: '#e0483a' };
  const statusPie = (apiM?.statusRows || []).map((r) => ({ name: STATUS_LABEL[r.klass] || `${r.klass}xx`, value: Number(r.n || 0), klass: r.klass }));
  const totalReqs = statusPie.reduce((a, r) => a + r.value, 0);
  const errReqs = statusPie.filter((r) => r.klass >= 4).reduce((a, r) => a + r.value, 0);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Overview</Typography>

      <Grid container spacing={2} sx={{ mt: 0.5 }}>
        {TILES.map((t) => (
          <Grid key={t.key} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">{t.label}</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ color: t.color }}>{stats[t.key] ?? '—'}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Platform totals from the analytics report */}
      {rep && (
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          {[
            { label: 'Total Users', v: rep.totals.users },
            { label: 'Astrologers', v: rep.totals.astrologers },
            { label: 'Sessions', v: rep.totals.sessions },
            { label: 'Revenue (₹)', v: rep.totals.revenue?.toLocaleString?.() ?? rep.totals.revenue },
            { label: 'Mongo Storage (MB)', v: rep.totals.storageMb },
            { label: 'Documents', v: rep.totals.documents?.toLocaleString?.() ?? rep.totals.documents },
          ].map((s) => (
            <Grid key={s.label} item xs={6} md={2}>
              <Card><CardContent sx={{ py: 1.5 }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h6" fontWeight={700}>{s.v ?? '—'}</Typography>
              </CardContent></Card>
            </Grid>
          ))}
        </Grid>
      )}

      {loading && <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>}

      {rep && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Per-tenant: users & sessions</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={tenantBars}>
                  <XAxis dataKey="name" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                  <Legend />
                  <Bar dataKey="users" fill="#7c4dff" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sessions" fill="#26c6da" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>Subscriptions</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={subData} dataKey="value" nameKey="name" outerRadius={90} label>
                    {subData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>MongoDB storage per tenant (MB)</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tenantBars}>
                  <XAxis dataKey="name" stroke="#888" fontSize={12} />
                  <YAxis stroke="#888" fontSize={12} />
                  <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                  <Bar dataKey="storageMb" fill="#66bb6a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ── Google Cloud VM metrics (live, from Cloud Monitoring) ── */}
      {vm && vm.configured && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 4, mb: 1 }}>
            <Typography variant="h5" fontWeight={700}>Server (GCP VM)</Typography>
            <Typography variant="body2" color="text.secondary">{vm.instanceName} · last {vm.window?.hours || 3}h · live</Typography>
          </Box>
          {/* Latest-value tiles */}
          <Grid container spacing={2}>
            {[
              { label: 'CPU', v: vm.latest?.cpu, unit: '%', color: '#7c4dff', show: vm.present?.cpu },
              { label: 'Memory', v: vm.latest?.memory, unit: '%', color: '#26c6da', show: vm.present?.memory },
              { label: 'Disk', v: vm.latest?.disk, unit: '%', color: '#ffb300', show: vm.present?.disk },
              { label: 'Network in', v: vm.latest?.net, unit: ' KB/s', color: '#66bb6a', show: vm.present?.net },
            ].filter((x) => x.show).map((x) => (
              <Grid key={x.label} item xs={6} md={3}>
                <Card><CardContent sx={{ py: 1.5 }}>
                  <Typography variant="caption" color="text.secondary">{x.label}</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color: x.color }}>
                    {x.v != null ? `${x.v}${x.unit}` : '—'}
                  </Typography>
                </CardContent></Card>
              </Grid>
            ))}
          </Grid>
          {/* Charts for whichever series are present */}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {[
              { key: 'cpu', title: 'CPU utilization (%)', color: '#7c4dff', show: vm.present?.cpu },
              { key: 'memory', title: 'Memory used (%)', color: '#26c6da', show: vm.present?.memory },
              { key: 'disk', title: 'Disk used (%)', color: '#ffb300', show: vm.present?.disk },
              { key: 'net', title: 'Network in (KB/s)', color: '#66bb6a', show: vm.present?.net },
            ].filter((c) => c.show).map((c) => (
              <Grid key={c.key} item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>{c.title}</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={toSeries(vm[c.key])}>
                      <defs>
                        <linearGradient id={`g-${c.key}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={c.color} stopOpacity={0.4} />
                          <stop offset="100%" stopColor={c.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="#888" fontSize={11} minTickGap={28} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                      <Area type="monotone" dataKey="v" stroke={c.color} strokeWidth={2} fill={`url(#g-${c.key})`} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            ))}
          </Grid>
          {vm.present && !vm.present.memory && !vm.present.disk && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Memory &amp; disk need the GCP Ops Agent on the VM — install it to see those charts. CPU &amp; network are shown from the built-in agent.
            </Typography>
          )}
        </>
      )}

      {/* ── API health (from BigQuery api_logs) ── */}
      {apiM && apiM.configured && (
        <>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 4, mb: 1 }}>
            <Typography variant="h5" fontWeight={700}>API health</Typography>
            <Typography variant="body2" color="text.secondary">last {apiM.hours}h · {totalReqs.toLocaleString()} requests · {totalReqs ? ((errReqs / totalReqs) * 100).toFixed(1) : 0}% errors</Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Response time (ms) — p95 &amp; avg</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={apiSeries}>
                    <XAxis dataKey="time" stroke="#888" fontSize={11} minTickGap={30} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Legend />
                    <Line type="monotone" dataKey="p95" name="p95" stroke="#e0483a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avg" name="avg" stroke="#7c4dff" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Status codes</Typography>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" outerRadius={85} label>
                      {statusPie.map((s) => <Cell key={s.klass} fill={STATUS_COLOR[s.klass] || '#8d6e63'} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Request volume &amp; errors</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={apiSeries}>
                    <XAxis dataKey="time" stroke="#888" fontSize={11} minTickGap={30} />
                    <YAxis stroke="#888" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#171a2b', border: 'none' }} />
                    <Legend />
                    <Bar dataKey="reqs" name="requests" fill="#26c6da" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="errors" name="4xx/5xx" fill="#e0483a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>Slowest endpoints (p95)</Typography>
                <Box sx={{ maxHeight: 220, overflow: 'auto' }}>
                  {(apiM.slow || []).map((r) => (
                    <Box key={r.path} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.6, borderBottom: '1px solid', borderColor: 'divider', gap: 1 }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.path}</Typography>
                      <Typography variant="caption" sx={{ flexShrink: 0, color: Number(r.p95) > 1000 ? 'error.main' : 'text.secondary' }}>{r.p95}ms · {r.n}×</Typography>
                    </Box>
                  ))}
                  {!(apiM.slow || []).length && <Typography variant="caption" color="text.secondary">No data yet.</Typography>}
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
