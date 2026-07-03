import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, TextField, Button, Stack, Paper, Grid, Divider, Alert,
} from '@mui/material';
import toast from 'react-hot-toast';
import { Platform } from '../api';

// The single "create tenant" form: identity + branding (seeded into the tenant's
// AppConfig, so both apps get the tenant's theme/logo/splash on first launch) +
// per-tenant secrets (Mongo URL, Agora, PayU, WABridge). Everything the owner
// sets here is what a brand-new white-label client needs to go live.
export default function CreateTenant() {
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({
    slug: '', displayName: '',
    primaryColor: '#7c4dff', accentColor: '#ffb300', logoUrl: '', appIconUrl: '',
    userAppId: '', astroAppId: '',
    dbUri: '', agoraAppId: '', agoraAppCertificate: '',
    payuKey: '', payuSalt: '',
    waBridgeAppKey: '', waBridgeAuthKey: '', waBridgeDeviceId: '', waBridgeOtpTemplateId: '',
  });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = {
        slug: f.slug.trim().toLowerCase(),
        displayName: f.displayName.trim(),
        branding: {
          displayName: f.displayName.trim(),
          primaryColor: f.primaryColor, accentColor: f.accentColor,
          logoUrl: f.logoUrl || undefined, appIconUrl: f.appIconUrl || undefined,
        },
        androidUser: f.userAppId ? { applicationId: f.userAppId, label: f.displayName } : undefined,
        androidAstrologer: f.astroAppId ? { applicationId: f.astroAppId, label: `${f.displayName} Astrologer` } : undefined,
        secrets: {
          dbUri: f.dbUri || undefined,
          agoraAppId: f.agoraAppId || undefined,
          agoraAppCertificate: f.agoraAppCertificate || undefined,
          payuKey: f.payuKey || undefined, payuSalt: f.payuSalt || undefined,
          waBridgeAppKey: f.waBridgeAppKey || undefined, waBridgeAuthKey: f.waBridgeAuthKey || undefined,
          waBridgeDeviceId: f.waBridgeDeviceId || undefined, waBridgeOtpTemplateId: f.waBridgeOtpTemplateId || undefined,
        },
      };
      const { data } = await Platform.createTenant(body);
      toast.success(`Tenant "${data.data.slug}" provisioned`);
      nav(`/tenants/${data.data.slug}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Create failed');
    } finally {
      setBusy(false);
    }
  };

  const Section = ({ title, children }) => (
    <Paper sx={{ p: 2.5, mb: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 2 }} />
      {children}
    </Paper>
  );

  return (
    <Box component="form" onSubmit={submit} sx={{ maxWidth: 820 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>Create Tenant</Typography>

      <Section title="Identity">
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth required label="Slug (subdomain)" value={f.slug} onChange={set('slug')} helperText="a-z, 0-9, hyphen; 3–40 chars" /></Grid>
          <Grid item xs={6}><TextField fullWidth required label="Display name" value={f.displayName} onChange={set('displayName')} /></Grid>
        </Grid>
      </Section>

      <Section title="Branding (seeded into both apps' theme & splash)">
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth label="Primary color" type="color" value={f.primaryColor} onChange={set('primaryColor')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Accent color" type="color" value={f.accentColor} onChange={set('accentColor')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Logo URL" value={f.logoUrl} onChange={set('logoUrl')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="App icon URL (1024px)" value={f.appIconUrl} onChange={set('appIconUrl')} /></Grid>
        </Grid>
      </Section>

      <Section title="Android apps (build factory)">
        <Grid container spacing={2}>
          <Grid item xs={6}><TextField fullWidth label="User app applicationId" placeholder="com.acme.user" value={f.userAppId} onChange={set('userAppId')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Astrologer app applicationId" placeholder="com.acme.astrologer" value={f.astroAppId} onChange={set('astroAppId')} /></Grid>
        </Grid>
      </Section>

      <Section title="Secrets (encrypted at rest)">
        <Alert severity="info" sx={{ mb: 2 }}>
          Leave the Mongo URL blank to provision on the default cluster. Agora / PayU / WABridge are per-tenant.
        </Alert>
        <Grid container spacing={2}>
          <Grid item xs={12}><TextField fullWidth label="Mongo connection URL (optional)" value={f.dbUri} onChange={set('dbUri')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Agora App ID" value={f.agoraAppId} onChange={set('agoraAppId')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="Agora App Certificate" value={f.agoraAppCertificate} onChange={set('agoraAppCertificate')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="PayU Key" value={f.payuKey} onChange={set('payuKey')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="PayU Salt" value={f.payuSalt} onChange={set('payuSalt')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="WABridge App Key" value={f.waBridgeAppKey} onChange={set('waBridgeAppKey')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="WABridge Auth Key" value={f.waBridgeAuthKey} onChange={set('waBridgeAuthKey')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="WABridge Device ID" value={f.waBridgeDeviceId} onChange={set('waBridgeDeviceId')} /></Grid>
          <Grid item xs={6}><TextField fullWidth label="WABridge OTP Template ID" value={f.waBridgeOtpTemplateId} onChange={set('waBridgeOtpTemplateId')} /></Grid>
        </Grid>
      </Section>

      <Stack direction="row" spacing={2}>
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? 'Provisioning…' : 'Create & Provision'}
        </Button>
        <Button variant="text" onClick={() => nav('/tenants')}>Cancel</Button>
      </Stack>
    </Box>
  );
}
