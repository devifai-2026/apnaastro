import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from './AuthContext';
import Layout from './Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import TenantDetail from './pages/TenantDetail';
import CreateTenant from './pages/CreateTenant';
import Plans from './pages/Plans';
import Builds from './pages/Builds';
import Leads from './pages/Leads';
import Billing from './pages/Billing';
import Crons from './pages/Crons';

function RequireAuth({ children }) {
  const { owner, loading } = useAuth();
  if (loading) {
    return <Box sx={{ display: 'grid', placeItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
  }
  return owner ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/tenants/new" element={<CreateTenant />} />
        <Route path="/tenants/:slug" element={<TenantDetail />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/builds" element={<Builds />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/crons" element={<Crons />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
