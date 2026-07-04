import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button,
  MenuItem, TextField, Stack, Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { Platform } from '../api';

const STATUS = ['new', 'contacted', 'converted', 'closed'];
const COLOR = { new: 'info', contacted: 'warning', converted: 'success', closed: 'default' };

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Platform.listLeads(filter || undefined)
      .then(({ data }) => setLeads(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setLeads([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const setStatus = async (id, status) => {
    try { await Platform.updateLead(id, { status }); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  const counts = STATUS.reduce((a, s) => ({ ...a, [s]: leads.filter((l) => l.status === s).length }), {});

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Leads</Typography>
        <TextField select size="small" label="Status" value={filter} onChange={(e) => setFilter(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">All</MenuItem>
          {STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {STATUS.map((s) => <Chip key={s} label={`${s}: ${counts[s] || 0}`} color={COLOR[s]} variant="outlined" />)}
      </Stack>

      <Paper>
        <Table>
          <TableHead><TableRow>
            <TableCell>When</TableCell><TableCell>Name</TableCell><TableCell>Phone</TableCell>
            <TableCell>Email</TableCell><TableCell>Interested in</TableCell><TableCell>Status</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {leads.map((l) => (
              <TableRow key={l._id}>
                <TableCell>{new Date(l.createdAt).toLocaleString()}</TableCell>
                <TableCell><b>{l.name}</b></TableCell>
                <TableCell>
                  <Link href={`tel:${l.cc || ''}${l.phone}`}>{l.cc} {l.phone}</Link>
                  {' · '}
                  <Link href={`https://wa.me/${String((l.cc || '').replace(/\D/g, '')) + l.phone}`} target="_blank" rel="noreferrer">WhatsApp</Link>
                </TableCell>
                <TableCell>{l.email ? <Link href={`mailto:${l.email}`}>{l.email}</Link> : '—'}</TableCell>
                <TableCell>{l.intent || '—'}</TableCell>
                <TableCell>
                  <TextField select size="small" value={l.status} onChange={(e) => setStatus(l._id, e.target.value)} sx={{ minWidth: 130 }}>
                    {STATUS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                  </TextField>
                </TableCell>
              </TableRow>
            ))}
            {!leads.length && !loading && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No leads yet — they'll appear here when someone submits the landing-page form.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
