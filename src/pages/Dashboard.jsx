import { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { Platform } from '../api';

const TILES = [
  { key: 'tenants', label: 'Active Tenants', color: '#7c4dff' },
  { key: 'trialing', label: 'On Trial', color: '#26c6da' },
  { key: 'activeSubs', label: 'Paid / Active', color: '#66bb6a' },
  { key: 'suspended', label: 'Suspended', color: '#ef5350' },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});

  useEffect(() => {
    Platform.overview().then(({ data }) => setStats(data.data)).catch(() => {});
  }, []);

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Overview</Typography>
      <Grid container spacing={2} sx={{ mt: 1 }}>
        {TILES.map((t) => (
          <Grid key={t.key} item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">{t.label}</Typography>
                <Typography variant="h3" fontWeight={800} sx={{ color: t.color }}>
                  {stats[t.key] ?? '—'}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
