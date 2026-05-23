import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail.jsx'));
const SellerOnboarding = lazy(() => import('./pages/SellerOnboarding.jsx'));
const BuyerOnboarding = lazy(() => import('./pages/BuyerOnboarding.jsx'));
const SellerDashboard = lazy(() => import('./pages/SellerDashboard.jsx'));
const BuyerDashboard = lazy(() => import('./pages/BuyerDashboard.jsx'));
const Privacy = lazy(() => import('./pages/Privacy.jsx'));
const Terms = lazy(() => import('./pages/Terms.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

function PageLoader() {
  return <div className="p-12 text-center text-brand-600">Loading…</div>;
}

function Protected({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
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
    <ErrorBoundary>
      <div className="min-h-screen bg-cream">
        <Navbar />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />

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
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}
