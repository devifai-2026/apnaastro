import { useEffect, useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Grid, Card, CardContent, Chip, Button, Table, TableHead, TableRow,
  TableCell, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Stack, Tooltip,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import toast from 'react-hot-toast';
import { Platform } from '../api';

// Billing state → color + label. Mirrors backend billingOverview `state`.
const STATE = {
  paid: { c: '#2e9e6b', label: 'Paid / active' },
  due_soon: { c: '#f5a623', label: 'Due soon' },
  grace: { c: '#e0842b', label: 'In grace' },
  overdue: { c: '#e0483a', label: 'Overdue' },
  trial: { c: '#7c4dff', label: 'On trial' },
  suspended: { c: '#8a8a8a', label: 'Suspended' },
  active: { c: '#2e9e6b', label: 'Active' },
  none: { c: '#bbb', label: 'No plan' },
};
const money = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function Billing() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [pay, setPay] = useState(null); // tenant row being paid
  const [payForm, setPayForm] = useState({ amount: '5999', method: 'manual', reference: '' });

  const load = () => Platform.billing().then(({ data }) => setData(data.data)).catch(() => setData(null));
  useEffect(load, []);

  const rows = data?.rows || [];
  const totals = data?.totals || {};

  // Map: day-of-month → [rows due that day] for the shown month.
  const dueByDay = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      if (!r.dueDate) return;
      const d = new Date(r.dueDate);
      if (d.getFullYear() === month.y && d.getMonth() === month.m) {
        (map[d.getDate()] ||= []).push(r);
      }
    });
    return map;
  }, [rows, month]);

  const monthName = new Date(month.y, month.m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const firstDow = new Date(month.y, month.m, 1).getDay();
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const todayKey = (() => { const t = new Date(); return t.getFullYear() === month.y && t.getMonth() === month.m ? t.getDate() : -1; })();
  const shift = (delta) => setMonth((s) => { const d = new Date(s.y, s.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const openPay = (r) => { setPay(r); setPayForm({ amount: String(r.monthly || r.lastPaymentAmount || '5999'), method: 'manual', reference: '' }); };
  const submitPay = async () => {
    try {
      await Platform.recordPayment(pay.slug, { amount: Number(payForm.amount), method: payForm.method, reference: payForm.reference });
      toast.success(`Payment recorded for ${pay.displayName} — period extended 1 month`);
      setPay(null); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Billing</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      {/* Totals */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          { label: 'Monthly recurring', v: money(totals.monthlyRecurring), c: '#2e9e6b' },
          { label: 'Active', v: totals.active ?? '—', c: '#7c4dff' },
          { label: 'Due soon (7d)', v: totals.dueSoon ?? '—', c: '#f5a623' },
          { label: 'Overdue', v: totals.overdue ?? '—', c: '#e0483a' },
        ].map((t) => (
          <Grid key={t.label} item xs={6} md={3}>
            <Card><CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="text.secondary">{t.label}</Typography>
              <Typography variant="h5" fontWeight={800} sx={{ color: t.c }}>{t.v}</Typography>
            </CardContent></Card>
          </Grid>
        ))}
      </Grid>

      {/* Calendar */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
          <Button size="small" onClick={() => shift(-1)}><ChevronLeftIcon /></Button>
          <Typography variant="h6" fontWeight={700} sx={{ mx: 2, minWidth: 180, textAlign: 'center' }}>{monthName}</Typography>
          <Button size="small" onClick={() => shift(1)}><ChevronRightIcon /></Button>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {['paid', 'due_soon', 'overdue', 'trial'].map((k) => (
              <Box key={k} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: STATE[k].c }} />
                <Typography variant="caption" color="text.secondary">{STATE[k].label}</Typography>
              </Box>
            ))}
          </Stack>
        </Box>
        <Grid container columns={7} spacing={0.5}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <Grid item xs={1} key={d}><Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', fontWeight: 700 }}>{d}</Typography></Grid>
          ))}
          {Array.from({ length: firstDow }).map((_, i) => <Grid item xs={1} key={`b${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const due = dueByDay[day] || [];
            const isToday = day === todayKey;
            return (
              <Grid item xs={1} key={day}>
                <Box sx={{
                  minHeight: 66, borderRadius: 1.5, p: 0.5, border: '1px solid',
                  borderColor: isToday ? 'primary.main' : 'divider', bgcolor: isToday ? 'action.hover' : 'transparent',
                }}>
                  <Typography variant="caption" sx={{ fontWeight: isToday ? 800 : 500 }}>{day}</Typography>
                  <Stack spacing={0.25} sx={{ mt: 0.25 }}>
                    {due.slice(0, 3).map((r) => (
                      <Tooltip key={r.slug} title={`${r.displayName} — ${STATE[r.state]?.label || r.state} · ${money(r.monthly)}`}>
                        <Box onClick={() => openPay(r)} sx={{
                          cursor: 'pointer', fontSize: 10, px: 0.5, py: 0.1, borderRadius: 0.5, color: '#fff',
                          bgcolor: STATE[r.state]?.c || '#999', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        }}>{r.displayName}</Box>
                      </Tooltip>
                    ))}
                    {due.length > 3 && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>+{due.length - 3} more</Typography>}
                  </Stack>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Table of all tenants' billing */}
      <Paper>
        <Table size="small">
          <TableHead><TableRow>
            <TableCell>Tenant</TableCell><TableCell>State</TableCell><TableCell>Next due</TableCell>
            <TableCell>Monthly</TableCell><TableCell>Last paid</TableCell><TableCell align="right">Action</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.slug}>
                <TableCell><b>{r.displayName}</b> <Typography component="span" variant="caption" color="text.secondary">({r.slug})</Typography></TableCell>
                <TableCell><Chip size="small" label={STATE[r.state]?.label || r.state} sx={{ bgcolor: STATE[r.state]?.c, color: '#fff' }} /></TableCell>
                <TableCell>{r.dueDate ? new Date(r.dueDate).toLocaleDateString() : '—'}</TableCell>
                <TableCell>{money(r.monthly)}</TableCell>
                <TableCell>{r.lastPaymentAt ? `${new Date(r.lastPaymentAt).toLocaleDateString()} · ${money(r.lastPaymentAmount)}` : '—'}</TableCell>
                <TableCell align="right"><Button size="small" variant="outlined" onClick={() => openPay(r)}>Record payment</Button></TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>No tenants yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>

      {/* Record payment dialog */}
      <Dialog open={!!pay} onClose={() => setPay(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Record payment — {pay?.displayName}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Amount (₹)" type="number" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} fullWidth />
            <TextField select label="Method" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })} fullWidth>
              {['manual', 'razorpay', 'payu', 'cashfree', 'upi', 'bank'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
            </TextField>
            <TextField label="Reference (txn id / note)" value={payForm.reference} onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })} fullWidth />
            <Typography variant="caption" color="text.secondary">Recording a payment extends the billing period by one month and sets the subscription active.</Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPay(null)}>Cancel</Button>
          <Button variant="contained" onClick={submitPay}>Record payment</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
