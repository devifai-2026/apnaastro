import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Typography, Alert, Box, CircularProgress,
} from '@mui/material';
import toast from 'react-hot-toast';
import { Platform } from '../api';

/**
 * Confirm dialog for an irreversible tenant purge. Shared by the Tenants list
 * and TenantDetail so the guardrails can't drift apart.
 *
 * Delete always means everything: the database is dropped and every control-plane
 * row removed, so the slug is immediately reusable. There is intentionally no
 * "keep the data" option — a partial delete leaves the slug taken, which is the
 * exact problem this replaced.
 *
 * Guardrail: the operator must type the slug EXACTLY before the button enables,
 * and the database being dropped is named explicitly.
 *
 * Props: { tenant, open, onClose, onDone }
 *   tenant — { slug, dbName }  onDone() — called after a successful purge
 */
export default function PurgeTenantDialog({ tenant, open, onClose, onDone }) {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const slug = tenant?.slug || '';
  const matches = typed === slug && !!slug;

  const close = () => { if (!busy) { setTyped(''); onClose(); } };

  const purge = async () => {
    if (!matches) return;
    setBusy(true);
    try {
      const { data } = await Platform.purgeTenant(slug, typed);
      const d = data?.data || {};
      toast.success(`Deleted "${slug}" — database ${d.dbName} dropped. The slug is free to reuse.`, { duration: 6000 });
      setTyped('');
      onDone?.(d);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
        Permanently delete “{slug}”?
      </DialogTitle>
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          This cannot be undone and there is no backup.
        </Alert>

        <Typography variant="body2" gutterBottom>
          This drops the tenant database and removes the tenant record, its secrets,
          subscription and build history. Afterwards the slug <strong>{slug}</strong> is
          free and can be used for a new tenant.
        </Typography>

        {tenant?.dbName && (
          <Box sx={{ my: 2, p: 1.5, borderRadius: 1, bgcolor: 'error.dark', color: 'error.contrastText' }}>
            <Typography variant="caption" display="block">Database to be dropped</Typography>
            <Typography sx={{ fontFamily: 'monospace', fontWeight: 700 }}>{tenant.dbName}</Typography>
            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
              All users, astrologers, sessions, wallets and transactions in it are destroyed.
            </Typography>
          </Box>
        )}

        <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
          Type <strong>{slug}</strong> to confirm:
        </Typography>
        <TextField
          fullWidth autoFocus size="small" value={typed} disabled={busy}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && matches) purge(); }}
          placeholder={slug}
          error={!!typed && !matches}
          helperText={typed && !matches ? 'Does not match the slug' : ' '}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close} disabled={busy}>Cancel</Button>
        <Button
          onClick={purge}
          color="error"
          variant="contained"
          disabled={!matches || busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {busy ? 'Deleting…' : 'Delete permanently'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
