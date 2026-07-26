import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Chip, Paper, IconButton, Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Platform } from '../api';
import PurgeTenantDialog from '../components/PurgeTenantDialog';

const STATUS_COLOR = {
  trialing: 'info', active: 'success', past_due: 'warning', suspended: 'error', cancelled: 'default',
};

export default function Tenants() {
  const nav = useNavigate();
  const [tenants, setTenants] = useState([]);
  const [purging, setPurging] = useState(null); // tenant row pending purge

  const load = () => {
    Platform.listTenants().then(({ data }) => setTenants(data.data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

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
              <TableCell align="right">Actions</TableCell>
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
                <TableCell align="right">
                  <Tooltip title="Delete everything — drops the DB and frees the slug">
                    {/* stopPropagation: the row itself navigates on click. */}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); setPurging(t); }}
                    >
                      <DeleteForeverIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!tenants.length && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No tenants yet. Create your first one.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      <PurgeTenantDialog
        tenant={purging}
        open={!!purging}
        onClose={() => setPurging(null)}
        onDone={load}
      />
    </Box>
  );
}
