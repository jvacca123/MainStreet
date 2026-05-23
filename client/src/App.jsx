import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

// Eager — small, every render
import Home  from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import NotFound  from './pages/NotFound.jsx';

// Lazy — large, behind auth
const SellerOnboarding = lazy(() => import('./pages/SellerOnboarding.jsx'));
const BuyerOnboarding  = lazy(() => import('./pages/BuyerOnboarding.jsx'));
const SellerDashboard  = lazy(() => import('./pages/SellerDashboard.jsx'));
const BuyerDashboard   = lazy(() => import('./pages/BuyerDashboard.jsx'));
const AccountSettings  = lazy(() => import('./pages/AccountSettings.jsx'));

// Lazy — secondary
const VerifyEmail    = lazy(() => import('./pages/VerifyEmail.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword  = lazy(() => import('./pages/ResetPassword.jsx'));
const Privacy        = lazy(() => import('./pages/Privacy.jsx'));
const Terms          = lazy(() => import('./pages/Terms.jsx'));
const About          = lazy(() => import('./pages/About.jsx'));

function Loader() {
  return <div className="container-wide py-16 text-center text-brand-500">Loading…</div>;
}

function Protected({ children, role, requireVerified = false }) {
  const { user, bootstrapping } = useAuth();
  const location = useLocation();
  if (bootstrapping) return <Loader />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  if (requireVerified && !user.emailVerified) return <Navigate to="/verify-email" replace />;
  return children;
}

function RoleRedirect() {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <Loader />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.hasProfile)   return <Navigate to={`/${user.role}/onboarding`} replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

function PublicOnly({ children }) {
  const { user, bootstrapping } = useAuth();
  if (bootstrapping) return <Loader />;
  if (user) return <Navigate to="/app" replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<Loader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about"   element={<About />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms"   element={<Terms />} />

            <Route path="/login"           element={<PublicOnly><Login /></PublicOnly>} />
            <Route path="/register"        element={<PublicOnly><Register /></PublicOnly>} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} />
            <Route path="/verify-email"    element={<VerifyEmail />} />

            <Route path="/app" element={<RoleRedirect />} />

            <Route path="/seller/onboarding" element={
              <Protected role="seller" requireVerified><SellerOnboarding /></Protected>
            } />
            <Route path="/seller/dashboard" element={
              <Protected role="seller" requireVerified><SellerDashboard /></Protected>
            } />

            <Route path="/buyer/onboarding" element={
              <Protected role="buyer" requireVerified><BuyerOnboarding /></Protected>
            } />
            <Route path="/buyer/dashboard" element={
              <Protected role="buyer" requireVerified><BuyerDashboard /></Protected>
            } />

            <Route path="/account" element={<Protected><AccountSettings /></Protected>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
