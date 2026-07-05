import { useEffect, useState } from 'react';
import {
  Box, Typography, Paper, TextField, MenuItem, Button, Stack, Chip, Divider, Accordion,
  AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { Platform } from '../api';

// AI System Prompts ("Danger Prompts") — PO-managed per tenant. Editing these
// changes how each tenant's LLM features (marketing, recaps, live, etc.) behave.
export default function Prompts() {
  const [tenants, setTenants] = useState([]);
  const [slug, setSlug] = useState('');
  const [prompts, setPrompts] = useState([]);
  const [edits, setEdits] = useState({}); // key -> edited text
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Platform.listTenants().then(({ data }) => {
      const ts = (data.data || []).filter((t) => t.status === 'active');
      setTenants(ts);
      if (ts[0]) setSlug((s) => s || ts[0].slug);
    }).catch(() => {});
  }, []);

  const load = () => {
    if (!slug) return;
    setLoading(true);
    Platform.listPrompts(slug)
      .then(({ data }) => { setPrompts(data.data || []); setEdits({}); })
      .catch(() => toast.error('Failed to load prompts'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  const save = async (key) => {
    const system = edits[key];
    if (system == null) return;
    try {
      await Platform.updatePrompt(slug, { key, system });
      toast.success('Prompt saved');
      load();
    } catch (e) { toast.error(e.response?.data?.message || 'Save failed'); }
  };
  const resetDefault = async (p) => {
    if (!confirm(`Reset "${p.label}" to the built-in default for ${slug}?`)) return;
    try { await Platform.updatePrompt(slug, { key: p.key, system: '' }); toast.success('Reset to default'); load(); }
    catch (e) { toast.error(e.response?.data?.message || 'Failed'); }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h4" fontWeight={700} sx={{ flexGrow: 1 }}>AI Prompts</Typography>
        <TextField select size="small" label="Tenant" value={slug} onChange={(e) => setSlug(e.target.value)} sx={{ minWidth: 200 }}>
          {tenants.map((t) => <MenuItem key={t.slug} value={t.slug}>{t.displayName} ({t.slug})</MenuItem>)}
          {!tenants.length && <MenuItem value="" disabled>No active tenants</MenuItem>}
        </TextField>
        <Button startIcon={<RefreshIcon />} onClick={load}>Refresh</Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        System prompts that drive each tenant's AI features (marketing, chat recaps, live moderation, etc.).
        Editing here changes behaviour for <b>{slug || 'the selected tenant'}</b> only. Leave blank &amp; save to reset to the built-in default.
      </Typography>

      {prompts.map((p) => (
        <Accordion key={p.key} sx={{ mb: 1 }} disableGutters>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', width: '100%' }}>
              <Typography fontWeight={700}>{p.label}</Typography>
              {p.isOverridden
                ? <Chip size="small" color="warning" label="customised" />
                : <Chip size="small" variant="outlined" label="default" />}
              <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>{p.key}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{p.description}</Typography>
            <TextField
              multiline minRows={6} maxRows={22} fullWidth
              value={edits[p.key] ?? p.system}
              onChange={(e) => setEdits((s) => ({ ...s, [p.key]: e.target.value }))}
              sx={{ fontFamily: 'monospace', '& textarea': { fontFamily: 'monospace', fontSize: 13, lineHeight: 1.5 } }}
            />
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Button variant="contained" onClick={() => save(p.key)} disabled={(edits[p.key] ?? p.system) === p.system}>Save</Button>
              <Button onClick={() => setEdits((s) => ({ ...s, [p.key]: p.system }))} disabled={(edits[p.key] ?? p.system) === p.system}>Discard changes</Button>
              <Box sx={{ flexGrow: 1 }} />
              {p.isOverridden && <Button color="warning" onClick={() => resetDefault(p)}>Reset to default</Button>}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}
      {!prompts.length && !loading && <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>No prompts — pick a tenant.</Paper>}
    </Box>
  );
}
