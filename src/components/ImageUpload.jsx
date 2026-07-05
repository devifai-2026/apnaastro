import { useRef, useState } from 'react';
import { Box, Button, Typography, Stack, CircularProgress } from '@mui/material';
import UploadIcon from '@mui/icons-material/CloudUpload';
import toast from 'react-hot-toast';
import { Platform } from '../api';

/**
 * Upload-a-file control for tenant branding (logo / app icon). Uploads to GCS via
 * the owner API and calls onChange(url) with the returned public URL. Shows a live
 * preview. `kind` = 'logo' | 'icon'; `slug` scopes the object path (optional).
 */
export default function ImageUpload({ label, hint, kind = 'logo', slug, value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) { toast.error('Use a PNG, JPG, WebP or GIF'); return; }
    if (file.size > 8 * 1024 * 1024) { toast.error('Max 8 MB'); return; }
    setBusy(true);
    try {
      const { data } = await Platform.uploadBranding(file, kind, slug);
      onChange(data.data.url);
      toast.success(`${label} uploaded`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: 2, border: '1px dashed', borderColor: 'divider',
            display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'action.hover', flex: '0 0 auto',
          }}
        >
          {value
            ? <img src={value} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Typography variant="caption" color="text.disabled">none</Typography>}
        </Box>
        <Button size="small" variant="outlined" startIcon={busy ? <CircularProgress size={14} /> : <UploadIcon />} onClick={pick} disabled={busy}>
          {value ? 'Replace' : 'Upload'}
        </Button>
        {value && <Button size="small" color="inherit" onClick={() => onChange('')} disabled={busy}>Clear</Button>}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onFile} />
      </Stack>
      {hint && <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.5 }}>{hint}</Typography>}
    </Box>
  );
}
