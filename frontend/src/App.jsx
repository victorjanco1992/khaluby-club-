import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore.js';
import ClientLayout from './components/layout/ClientLayout.jsx';
import AdminLayout from './components/layout/AdminLayout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SorteoPublico from './pages/SorteoPublico.jsx';
import ClientDashboard from './pages/client/ClientDashboard.jsx';
import ClientRaffles from './pages/client/ClientRaffles.jsx';
import ClientRewards from './pages/client/ClientRewards.jsx';
import ClientPromotions from './pages/client/ClientPromotions.jsx';
import ClientProfile from './pages/client/ClientProfile.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdminClients from './pages/admin/AdminClients.jsx';
import AdminRaffles from './pages/admin/AdminRaffles.jsx';
import AdminSorteo from './pages/admin/AdminSorteo.jsx';
import AdminPurchases from './pages/admin/AdminPurchases.jsx';
import AdminRewards from './pages/admin/AdminRewards.jsx';
import AdminPromotions from './pages/admin/AdminPromotions.jsx';
import AdminConfig from './pages/admin/AdminConfig.jsx';
import NotificationOverlay from './components/NotificationOverlay.jsx';
import LiveRaffleOverlay from './components/LiveRaffleOverlay.jsx';
import InstallPWA from './components/InstallPWA.jsx';
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
};
export default function App() {
  const { isAuthenticated, isAdmin } = useAuthStore();
  return (
    <>
      <InstallPWA />
      {isAuthenticated() && !isAdmin() && <NotificationOverlay />}
      {isAuthenticated() && !isAdmin() && <LiveRaffleOverlay />}
      <Routes>
        <Route
          path="/"
          element={<Navigate to={isAuthenticated() ? (isAdmin() ? '/admin' : '/dashboard') : '/login'} />}
        />
        <Route
          path="/login"
          element={isAuthenticated() ? <Navigate to={isAdmin() ? '/admin' : '/dashboard'} /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={isAuthenticated() ? <Navigate to="/dashboard" /> : <RegisterPage />}
        />
        <Route path="/sorteo" element={<SorteoPublico />} />
        <Route path="/" element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
          <Route path="dashboard" element={<ClientDashboard />} />
          <Route path="sorteos" element={<ClientRaffles />} />
          <Route path="recompensas" element={<ClientRewards />} />
          <Route path="promociones" element={<ClientPromotions />} />
          <Route path="perfil" element={<ClientProfile />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path="clientes" element={<AdminClients />} />
          <Route path="sorteos" element={<AdminRaffles />} />
          <Route path="sorteos/:id/realizar" element={<AdminSorteo />} />
          <Route path="compras" element={<AdminPurchases />} />
          <Route path="recompensas" element={<AdminRewards />} />
          <Route path="promociones" element={<AdminPromotions />} />
          <Route path="config" element={<AdminConfig />} />
        </Route>
      </Routes>
    </>
  );
}
