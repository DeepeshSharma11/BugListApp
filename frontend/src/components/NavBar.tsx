import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { getAuthState } from '../lib/auth';
import { useTheme } from '../context/ThemeContext';

/* ── Icons (inline SVG helpers) ────────────────────────── */
const Icon = ({ d, size = 18 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const ICONS: Record<string, string> = {
  Submit:          'M12 5v14M5 12l7-7 7 7',
  Team:            'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  Notifications:   'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  Profile:         'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  Admin:           'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'Support Tickets':'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
};

export default function NavBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  /* scroll shadow */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    let realtimeSub: ReturnType<typeof supabase.channel> | null = null;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      void checkAdmin(session);
      void loadUnread(session);

      if (session?.user) {
        realtimeSub = supabase
          .channel('navbar-notifications')
          .on('postgres_changes', {
            event: '*', schema: 'public', table: 'notifications',
            filter: `recipient_id=eq.${session.user.id}`,
          }, () => void loadUnread(session))
          .subscribe();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void checkAdmin(s);
      void loadUnread(s);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeSub) void supabase.removeChannel(realtimeSub);
    };
  }, []);

  useEffect(() => { void loadUnread(session); }, [location.pathname, session]);

  const checkAdmin = async (s: any) => {
    const auth = await getAuthState(s ?? null);
    setIsAdmin(auth.isAdmin);
  };

  const loadUnread = async (s: any) => {
    if (!s?.user) { setUnreadCount(0); return; }
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', s.user.id)
      .eq('is_read', false);
    if (!error) setUnreadCount(count ?? 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
    setIsOpen(false);
  };

  const baseLinks = [
    { name: 'Submit',        path: '/dashboard/submit' },
    { name: 'Team',          path: '/dashboard/team' },
    { name: 'Notifications', path: '/dashboard/notifications' },
    { name: 'Profile',       path: '/dashboard/profile' },
  ];
  const navLinks = isAdmin
    ? [...baseLinks, { name: 'Admin', path: '/admin' }, { name: 'Support Tickets', path: '/admin/support' }]
    : baseLinks;

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'shadow-[0_2px_16px_rgba(0,0,0,0.08)] backdrop-blur-md'
          : 'backdrop-blur-sm'
      }`}
      style={{ background: 'var(--surface-color)', borderBottom: '1px solid var(--border-color)' }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* ── Left section: Logo ── */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img 
              src="/ladybug.png" 
              alt="Bug Tracker" 
              className="w-9 h-9 object-contain drop-shadow-md transition-transform group-hover:scale-105 select-none"
            />
              <div className="hidden sm:block leading-tight mt-0.5">
                <span className="block text-[15px] font-semibold" style={{ color: 'var(--text-color)' }}>
                  Bug Tracker
                </span>
                <span className="block text-[11px]" style={{ color: 'var(--muted-text)' }}>Workspace</span>
              </div>
            </Link>
          </div>

          {/* ── Desktop nav ────────────────────────────── */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center px-4">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                            transition-all duration-150 whitespace-nowrap
                            ${isActive(link.path) ? 'nav-pill-active' : 'nav-pill'}`}
              >
                {ICONS[link.name] && <Icon d={ICONS[link.name]} size={15} />}
                {link.name}
                {link.path === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500
                                   text-[10px] font-bold text-white flex items-center justify-center shadow">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* ── Right controls ─────────────────────────── */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Theme toggle pill (Desktop) */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 mr-1"
              style={{
                background: 'var(--soft-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--muted-text)',
              }}
            >
              {theme === 'dark' ? (
                /* sun icon */
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                /* moon icon */
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            {/* Auth */}
            {session ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                           hover:bg-[var(--soft-surface)]"
                style={{ color: 'var(--muted-text)' }}
              >
                Log out
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7c6ff7 0%,#5b8def 100%)' }}
              >
                Log in
              </Link>
            )}
          </div>

          {/* ── Mobile hamburger ───────────────────────── */}
          <div className="flex md:hidden items-center gap-2">
            {/* Badge for mobile notifications */}
            {unreadCount > 0 && (
              <Link to="/dashboard/notifications"
                className="relative w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ color: 'var(--muted-text)', border: '1px solid var(--border-color)' }}>
                <Icon d={ICONS['Notifications']} size={17} />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500
                                 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </Link>
            )}
            <button
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle menu"
              className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors
                         hover:bg-[var(--soft-surface)]"
              style={{ color: 'var(--muted-text)', border: '1px solid var(--border-color)' }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                {isOpen
                  ? <><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>
                  : <><path d="M3 12h18"/><path d="M3 6h18"/><path d="M3 18h18"/></>
                }
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile drawer ──────────────────────────────── */}
      {isOpen && (
        <div
          className="md:hidden fade-in"
          style={{
            background: 'var(--surface-color)',
            borderTop: '1px solid var(--border-color)',
          }}
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium
                            transition-all duration-150
                            ${isActive(link.path) ? 'nav-pill-active' : 'nav-pill'}`}
              >
                {ICONS[link.name] && <Icon d={ICONS[link.name]} size={17} />}
                <span className="flex-1">{link.name}</span>
                {link.path === '/dashboard/notifications' && unreadCount > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Mobile footer actions */}
          <div className="px-4 pb-4 pt-4 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border-color)' }}>
            <button
              onClick={() => { toggleTheme(); }}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={{
                background: 'var(--soft-surface)',
                border: '1px solid var(--border-color)',
                color: 'var(--muted-text)',
              }}
            >
              {theme === 'dark' ? (
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                </svg>
              ) : (
                <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
              Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
            </button>
            {session ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium
                           text-rose-500 hover:bg-rose-50 transition-colors"
              >
                <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4
                           M16 17l5-5-5-5M21 12H9"/>
                </svg>
                Log out
              </button>
            ) : (
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl
                           text-sm font-semibold text-white mt-1 transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#7c6ff7 0%,#5b8def 100%)' }}
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}