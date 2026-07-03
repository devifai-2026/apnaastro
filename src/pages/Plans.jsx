import { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Stack, MenuItem,
} from '@mui/material';
import toast from 'react-hot-toast';
import { Platform } from '../api';

export default function Plans() {
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ key: '', name: '', price: 0, interval: 'month', trialDays: 0 });

  const load = useCallback(() => Platform.listPlans().then(({ data }) => setPlans(data.data)).catch(() => {}), []);
  useEffect(load, [load]);

  const save = async () => {
    try {
      await Platform.upsertPlan({ ...f, price: Number(f.price), trialDays: Number(f.trialDays) });
      toast.success('Plan saved'); setOpen(false); load();
    } catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Plans</Typography>
        <Button variant="contained" onClick={() => { setF({ key: '', name: '', price: 0, interval: 'month', trialDays: 0 }); setOpen(true); }}>Add Plan</Button>
      </Box>
      <Paper>
        <Table>
          <TableHead><TableRow>
            <TableCell>Key</TableCell><TableCell>Name</TableCell><TableCell>Price</TableCell><TableCell>Interval</TableCell><TableCell>Trial days</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {plans.map((p) => (
              <TableRow key={p.key}>
                <TableCell><b>{p.key}</b></TableCell><TableCell>{p.name}</TableCell>
                <TableCell>{p.price ? `₹${p.price}` : 'Free'}</TableCell>
                <TableCell>{p.interval}</TableCell><TableCell>{p.trialDays || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Add / Update Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Key" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} helperText="unique id, e.g. pro" />
            <TextField label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            <TextField label="Price (₹)" type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
            <TextField select label="Interval" value={f.interval} onChange={(e) => setF({ ...f, interval: e.target.value })}>
              {['month', 'year', 'trial'].map((i) => <MenuItem key={i} value={i}>{i}</MenuItem>)}
            </TextField>
            <TextField label="Trial days" type="number" value={f.trialDays} onChange={(e) => setF({ ...f, trialDays: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
