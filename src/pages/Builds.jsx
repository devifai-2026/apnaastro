import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableRow, TableCell, TableBody, Chip, Button, Link,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { Platform } from '../api';

const COLOR = { queued: 'default', running: 'info', succeeded: 'success', failed: 'error', cancelled: 'warning' };

export default function Builds() {
  const [builds, setBuilds] = useState([]);
  const load = () => Platform.listBuilds().then(({ data }) => setBuilds(data.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>Android Builds</Typography>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>
      <Paper>
        <Table>
          <TableHead><TableRow>
            <TableCell>Tenant</TableCell><TableCell>App</TableCell><TableCell>Artifact</TableCell>
            <TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell>Download</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {builds.map((b) => (
              <TableRow key={b._id}>
                <TableCell><b>{b.tenantSlug}</b></TableCell>
                <TableCell>{b.app}</TableCell>
                <TableCell>{b.artifact}</TableCell>
                <TableCell><Chip size="small" color={COLOR[b.status] || 'default'} label={b.status} /></TableCell>
                <TableCell>{new Date(b.createdAt).toLocaleString()}</TableCell>
                <TableCell>{b.artifactUrl ? <Link href={b.artifactUrl} target="_blank" rel="noreferrer">Download</Link> : '—'}</TableCell>
              </TableRow>
            ))}
            {!builds.length && (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                No builds yet. Trigger one from a tenant's page.
              </TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}
