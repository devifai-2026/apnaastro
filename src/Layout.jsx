import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Drawer, List, ListItemButton, ListItemIcon,
  ListItemText, Box, Button, Chip,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PaymentsIcon from '@mui/icons-material/Payments';
import AndroidIcon from '@mui/icons-material/Android';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from './AuthContext';

const DRAWER = 232;
const NAV = [
  { to: '/', label: 'Dashboard', icon: <DashboardIcon /> },
  { to: '/tenants', label: 'Tenants', icon: <BusinessIcon /> },
  { to: '/leads', label: 'Leads', icon: <ContactPhoneIcon /> },
  { to: '/billing', label: 'Billing', icon: <CalendarMonthIcon /> },
  { to: '/plans', label: 'Plans', icon: <PaymentsIcon /> },
  { to: '/builds', label: 'Builds', icon: <AndroidIcon /> },
];

export default function Layout() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { owner, logout } = useAuth();

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Platform Owner Console
          </Typography>
          <Chip size="small" label={owner?.email} sx={{ mr: 2 }} />
          <Button color="inherit" startIcon={<LogoutIcon />} onClick={() => { logout(); nav('/login'); }}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{ width: DRAWER, flexShrink: 0, [`& .MuiDrawer-paper`]: { width: DRAWER, boxSizing: 'border-box' } }}
      >
        <Toolbar />
        <List>
          {NAV.map((n) => {
            const active = n.to === '/' ? pathname === '/' : pathname.startsWith(n.to);
            return (
              <ListItemButton key={n.to} selected={active} onClick={() => nav(n.to)}>
                <ListItemIcon>{n.icon}</ListItemIcon>
                <ListItemText primary={n.label} />
              </ListItemButton>
            );
          })}
        </List>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
