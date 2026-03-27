import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Menu, Moon, Quote, Search, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { CardGridSkeleton, PageSkeleton, StatsSkeleton } from './Skeleton';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationCenter from './NotificationCenter';

const QUOTES = [
  'A horse is poetry in motion.',
  'No hour is wasted spent in the saddle.',
  'Horses lend us the wings we lack.',
  "The horse knows. He knows to the penny how much he's worth.",
  'In riding a horse, we borrow freedom.',
  'There is no secret so close as between a rider and his horse.',
  'One can get in a horse a power that no other animal can give.',
  'Four legs move the body. The heart moves the soul.',
  'Courage is being scared to death but saddling up anyway.',
  'A pony is a childhood dream, a horse is an adulthood treasure.',
];

function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [routeSkeleton, setRouteSkeleton] = useState(true);
  const [theme, setTheme] = useState(() => {
    const saved = window.localStorage.getItem('efm.ui.theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return 'dark';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = window.localStorage.getItem('efm.sidebar.collapsed');
    return saved === '1';
  });
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const innerContentRef = useRef(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
    if (innerContentRef.current) {
      innerContentRef.current.scrollTop = 0;
    }
    setRouteSkeleton(true);
    const timer = window.setTimeout(() => {
      setRouteSkeleton(false);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem('efm.sidebar.collapsed', sidebarCollapsed ? '1' : '0');
  }, [sidebarCollapsed]);

  useEffect(() => {
    window.localStorage.setItem('efm.ui.theme', theme);
    document.documentElement.setAttribute('data-efm-theme', theme);
    document.documentElement.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('light', theme === 'light');
    document.body.classList.toggle('efm-theme-light', theme === 'light');
    const themeColor = theme === 'light' ? '#f6f7fb' : '#09090b';
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute('content', themeColor);
    }
  }, [theme]);

  const quote = useMemo(() => QUOTES[quoteIndex], [quoteIndex]);

  return (
    <div className={`lovable-shell lovable-theme-${theme}`}>
      <Sidebar
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      {mobileOpen && (
        <button
          className="lovable-shell-overlay"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
          type="button"
        />
      )}

      <div className="lovable-shell-body">
        <header className="lovable-topbar">
          <div className="lovable-topbar-left">
            <button className="lovable-menu-btn" onClick={() => setMobileOpen(true)} aria-label="Open menu" type="button">
              <Menu size={18} />
            </button>

            <div className="lovable-brand-mobile">EFM</div>

            <div className="lovable-search-wrap lovable-topbar-sm-up">
              <SearchBar placeholder={t('Command + K to search...')} />
            </div>

            <div className="lovable-quote lovable-topbar-md-up">
              <Quote size={14} className="lovable-quote-icon" />
              <div className="lovable-quote-lane">
                <span key={quoteIndex} className="lovable-quote-text">
                  {quote}
                </span>
              </div>
            </div>
          </div>

          <div className="lovable-topbar-right">
            <div className="lovable-topbar-actions">
              <button
                className="lovable-mobile-search-btn"
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                aria-label="Toggle search"
                type="button"
              >
                <Search size={16} />
              </button>
              <button
                className="lovable-topbar-icon"
                type="button"
                aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              >
                {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
              <div className="lovable-topbar-sm-up">
                <LanguageSwitcher compact />
              </div>
              <NotificationCenter />
            </div>
            <div className="lovable-topbar-divider lovable-topbar-sm-up" />
            <Link to="/profile" className="lovable-user-pill">
              <div className="lovable-user-pill-copy lovable-topbar-sm-up">
                <span className="lovable-user-name">{user?.fullName || 'Admin User'}</span>
                <span className="lovable-user-role">{t(user?.designation || 'Super Admin')}</span>
              </div>
              <div className="lovable-user-avatar">
                {user?.profileImage ? (
                  <img src={user.profileImage} alt={user.fullName} className="lovable-user-avatar-img" />
                ) : (
                  <User size={16} />
                )}
              </div>
            </Link>
          </div>
        </header>

        {mobileSearchOpen && (
          <div className="lovable-mobile-search">
            <SearchBar placeholder={t('Search...')} />
          </div>
        )}

        <div className="lovable-quote-mobile">
          <Quote size={12} className="lovable-quote-icon" />
          <div className="lovable-quote-lane lovable-quote-lane-mobile">
            <span key={quoteIndex} className="lovable-quote-text lovable-quote-text-mobile">
              {quote}
            </span>
          </div>
        </div>

        <main className="lovable-main-content">
          <div className="main-content-inner" ref={innerContentRef}>
            {routeSkeleton ? (
              <div className="lovable-route-skeleton">
                <PageSkeleton>
                  <StatsSkeleton count={4} />
                  <CardGridSkeleton count={4} />
                </PageSkeleton>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
