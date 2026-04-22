import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getAuthState } from '../lib/auth';
import { useTheme } from '../context/ThemeContext';

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    let realtimeSub: ReturnType<typeof supabase.channel> | null = null;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      void checkAdmin(session);
      void loadUnreadNotifications(session);

      // Subscribe to realtime notifications changes for this user
      if (session?.user) {
        realtimeSub = supabase
          .channel('navbar-notifications')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'notifications',
              filter: `recipient_id=eq.${session.user.id}`,
            },
            () => {
              void loadUnreadNotifications(session);
            }
          )
          .subscribe();
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      void checkAdmin(session);
      void loadUnreadNotifications(session);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeSub) void supabase.removeChannel(realtimeSub);
    };
  }, []);

  useEffect(() => {
    void loadUnreadNotifications(session);
  }, [location.pathname, session]);

  const checkAdmin = async (currentSession: any) => {
    const authState = await getAuthState(currentSession ?? null);
    setIsAdmin(authState.isAdmin);
  };

  const loadUnreadNotifications = async (currentSession: any) => {
    if (!currentSession?.user) {
      setUnreadCount(0);
      return;
    }

    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', currentSession.user.id)
      .eq('is_read', false);

    if (!error) {
      setUnreadCount(count ?? 0);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    setIsOpen(false);
  };

  

  const baseNavLinks = [
    { name: 'Submit', path: '/dashboard/submit' },
    { name: 'Team', path: '/dashboard/team' },
    { name: 'Notifications', path: '/dashboard/notifications' },
    { name: 'Profile', path: '/dashboard/profile' },
  ];

  const navLinks = isAdmin 
    ? [...baseNavLinks, { name: 'Admin', path: '/admin' }]
    : baseNavLinks;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-color)] bg-[var(--surface-color)]/90 shadow-sm backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-3 py-2">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                BT
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold leading-tight text-[var(--text-color)]">Bug Tracker</h1>
                <p className="text-xs font-medium text-[var(--muted-text)]">Workspace</p>
              </div>
            </Link>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center">
            <nav className="flex gap-1 lg:gap-2 mr-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    location.pathname.startsWith(link.path)
                      ? 'bg-blue-50 text-blue-700 shadow-sm'
                      : 'text-[var(--muted-text)] hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <span>{link.name}</span>
                    {link.path === '/dashboard/notifications' && unreadCount > 0 && (
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </nav>
            
            

            <div className="mr-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center rounded-md border border-[var(--border-color)] bg-[var(--soft-surface)] px-3 py-2 text-sm font-medium text-[var(--text-color)] transition hover:opacity-90"
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            {/* Auth Actions */}
            <div className="flex items-center pl-4 border-l border-[var(--border-color)]">
              {session ? (
                <button
                  onClick={handleLogout}
                  className="text-sm font-medium text-[var(--muted-text)] transition-colors hover:text-[var(--text-color)]"
                >
                  Log out
                </button>
              ) : (
                <Link
                  to="/login"
                  className="text-sm font-medium text-[var(--muted-text)] transition-colors hover:text-[var(--text-color)]"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="rounded-md p-2 text-[var(--muted-text)] transition-colors hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)] focus:outline-none"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {isOpen && (
        <div className="md:hidden border-t border-[var(--border-color)] bg-[var(--surface-color)]">
          <div className="px-4 pt-2 pb-4 space-y-1 shadow-inner">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-md text-base font-medium transition-colors ${
                  location.pathname.startsWith(link.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-[var(--muted-text)] hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)]'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span>{link.name}</span>
                  {link.path === '/dashboard/notifications' && unreadCount > 0 && (
                    <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </Link>
            ))}
            
            

            <div className="mt-2 border-t border-[var(--border-color)] pt-2">
              <button
                type="button"
                onClick={toggleTheme}
                className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-[var(--muted-text)] transition-colors hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)]"
              >
                Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
              </button>
              {session ? (
                <button
                  onClick={handleLogout}
                  className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-[var(--muted-text)] transition-colors hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)]"
                >
                  Log out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-[var(--muted-text)] transition-colors hover:bg-[var(--soft-surface)] hover:text-[var(--text-color)]"
                >
                  Log in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}