import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const onMarketing = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register';

  return (
    <nav className={`sticky top-0 z-30 backdrop-blur ${onMarketing ? 'bg-cream/80' : 'bg-white/90'} border-b border-brand-100`}>
      <div className="container-wide flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
            <rect width="64" height="64" rx="14" fill="#1a3d2b" />
            <path d="M16 44 V28 L32 18 L48 28 V44 H38 V34 H26 V44 Z" fill="#e8a020" />
          </svg>
          <span className="font-display text-xl text-brand-900 font-semibold tracking-tight">MainStreet</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-4">
          {!user ? (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn-primary btn-sm">Get started</Link>
            </>
          ) : (
            <>
              <Link
                to={user.hasProfile ? `/${user.role}/dashboard` : `/${user.role}/onboarding`}
                className="text-sm text-brand-800 hover:text-brand-600 font-medium"
              >
                Dashboard
              </Link>
              <span className="hidden sm:inline text-sm text-brand-500">
                {user.fullName || user.email}
              </span>
              <button
                onClick={() => { logout(); navigate('/'); }}
                className="btn-outline btn-sm"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
