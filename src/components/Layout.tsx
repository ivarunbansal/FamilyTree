import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ThemeToggle } from './ThemeToggle';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, isAdmin, logout } = useAuth();
  const { toasts, removeToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090b12] via-[#0f172a] to-[#132033] dark text-white">
      <header className="sticky top-3 z-50 w-[min(1500px,calc(100%-24px))] mx-auto">
        <div className="flex items-center justify-between min-h-[70px] px-4 py-3 rounded-lg border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl">
          <Link to="/tree" className="flex items-center gap-3 no-underline text-white">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple-400 to-teal-400 flex items-center justify-center font-black text-white text-sm">
              FT
            </div>
            <div className="hidden sm:block">
              <div className="font-semibold">Bansal Family Tree</div>
              <div className="text-xs text-gray-400 -mt-0.5">Preserving our legacy</div>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            {isAuthenticated && (
              <>
                <Link
                  to="/tree"
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    location.pathname === '/tree'
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  Tree
                </Link>
                {isAdmin && (
                  <Link
                    to="/dashboard"
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      location.pathname === '/dashboard'
                        ? 'bg-purple-500/20 text-purple-300'
                        : 'text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    Dashboard
                  </Link>
                )}
                <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/10">
                  <span className="text-sm text-gray-400 hidden md:block">
                    {profile?.displayName || user?.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1.5 text-sm rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="w-[min(1500px,calc(100%-24px))] mx-auto py-6">
        {children}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            className={`px-5 py-3 rounded-lg border backdrop-blur-xl shadow-2xl font-semibold text-sm pointer-events-auto cursor-pointer transition-all animate-[toastIn_300ms_ease_both] ${
              t.type === 'success'
                ? 'bg-green-900/80 border-green-500/50 text-green-300'
                : t.type === 'error'
                ? 'bg-red-900/80 border-red-500/50 text-red-300'
                : 'bg-gray-800/80 border-gray-500/50 text-gray-200'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}
