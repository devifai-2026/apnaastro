import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { Platform } from '../api';

const STATUS_COLOR = {
  trialing: 'info', active: 'success', past_due: 'warning', suspended: 'error', cancelled: 'default',
};

export default function Tenants() {
  const nav = useNavigate();
  const [tenants, setTenants] = useState([]);

  useEffect(() => {
    Platform.listTenants().then(({ data }) => setTenants(data.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Tenants</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => nav('/tenants/new')}>
          Create Tenant
        </Button>
      </Box>
      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Slug</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Subscription</TableCell>
              <TableCell>DB</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t._id} hover sx={{ cursor: 'pointer' }} onClick={() => nav(`/tenants/${t.slug}`)}>
                <TableCell><b>{t.slug}</b></TableCell>
                <TableCell>{t.displayName}</TableCell>
                <TableCell><Chip size="small" label={t.status} /></TableCell>
                <TableCell>
                  {t.subscription
                    ? <Chip size="small" color={STATUS_COLOR[t.subscription.status] || 'default'} label={t.subscription.status} />
                    : '—'}
                </TableCell>
                <TableCell><code>{t.dbName}</code></TableCell>
              </TableRow>
            ))}
            {!tenants.length && (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No tenants yet. Create your first one.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
