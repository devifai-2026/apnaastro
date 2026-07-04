import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, TextField, Button, Typography, Stack } from '@mui/material';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login, owner } = useAuth();
  const nav = useNavigate();
  // Prefilled owner credentials for convenience during setup. TODO: clear these
  // defaults before opening the console to anyone but the platform owner.
  const [email, setEmail] = useState('owner@apnaastro.in');
  const [password, setPassword] = useState('ApnaAstro@2026');
  const [busy, setBusy] = useState(false);

  if (owner) { nav('/', { replace: true }); return null; }

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}>
      <Card sx={{ width: 380 }}>
        <CardContent>
          <Typography variant="h5" fontWeight={700} gutterBottom>Owner Console</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Platform control plane — tenants, billing, builds.
          </Typography>
          <form onSubmit={submit}>
            <Stack spacing={2}>
              <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
              <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Button type="submit" variant="contained" size="large" disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
