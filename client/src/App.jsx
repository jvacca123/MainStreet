import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import SellerOnboarding from './pages/SellerOnboarding.jsx';
import BuyerOnboarding from './pages/BuyerOnboarding.jsx';
import SellerDashboard from './pages/SellerDashboard.jsx';
import BuyerDashboard from './pages/BuyerDashboard.jsx';
import NotFound from './pages/NotFound.jsx';

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-12 text-center text-brand-600">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return children;
}

function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!user.hasProfile) return <Navigate to={`/${user.role}/onboarding`} replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function App() {
  return (
    <div className="min-h-screen bg-cream">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/app" element={<RoleRedirect />} />

        <Route path="/seller/onboarding" element={
          <Protected role="seller"><SellerOnboarding /></Protected>
        } />
        <Route path="/seller/dashboard" element={
          <Protected role="seller"><SellerDashboard /></Protected>
        } />

        <Route path="/buyer/onboarding" element={
          <Protected role="buyer"><BuyerOnboarding /></Protected>
        } />
        <Route path="/buyer/dashboard" element={
          <Protected role="buyer"><BuyerDashboard /></Protected>
        } />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
