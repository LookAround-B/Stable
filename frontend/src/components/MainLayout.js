import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Moon, Quote, Search, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { CardGridSkeleton, PageSkeleton, StatsSkeleton } from './Skeleton';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';
import LanguageSwitcher from './LanguageSwitcher';
import NotificationCenter from './NotificationCenter';
import { getStoredTheme, setAppTheme, subscribeToThemeChange } from '../lib/theme';

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

const ORBIT_HEADING_SELECTOR = 'h1, h2';

const createOrbitDot = () => {
  const dot = document.createElement('span');
  dot.className = 'orbit-heading-dot';
  dot.setAttribute('aria-hidden', 'true');

  const particle = document.createElement('span');
  particle.className = 'orbit-heading-particle';
  dot.appendChild(particle);

  return dot;
};

const accentLastWord = (heading) => {
  if (heading.querySelector('.orbit-heading-accent')) {
    return;
  }

  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue || !node.nodeValue.trim()) {
        return NodeFilter.FILTER_REJECT;
      }

      if (node.parentElement?.closest('.orbit-heading-dot')) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  const allWords = textNodes
    .map((node) => node.nodeValue.trim())
    .join(' ')
    .split(/\s+/)
    .filter(Boolean);

  if (allWords.length <= 1) {
    return;
  }

  const targetNode = textNodes[textNodes.length - 1];
  const match = targetNode.nodeValue.match(/^(.*?)([^\s]+)(\s*)$/);
  if (!match) {
    return;
  }

  const [, before, lastWord, trailing] = match;
  const fragment = document.createDocumentFragment();

  if (before) {
    fragment.appendChild(document.createTextNode(before));
  }

  const accent = document.createElement('span');
  accent.className = 'orbit-heading-accent';
  accent.textContent = lastWord;
  fragment.appendChild(accent);

  if (trailing) {
    fragment.appendChild(document.createTextNode(trailing));
  }

  targetNode.parentNode?.replaceChild(fragment, targetNode);
};

const resetHeadingEnhancement = (heading) => {
  heading.querySelectorAll('.orbit-heading-dot').forEach((dot) => dot.remove());
  heading.querySelectorAll('.orbit-heading-accent').forEach((accent) => {
    accent.replaceWith(document.createTextNode(accent.textContent || ''));
  });
  heading.classList.remove('orbit-heading');
  delete heading.dataset.orbitHeadingReady;
};

const enhanceHeading = (heading) => {
  if (!(heading instanceof HTMLElement)) {
    return;
  }

  if (heading.classList.contains('orbit-heading-ignore') || heading.closest('.dashboard-page, .dashboard-lovable, .dashboard-lovable-hero')) {
    resetHeadingEnhancement(heading);
    return;
  }

  if (heading.dataset.orbitHeadingReady === '1') {
    return;
  }

  heading.classList.add('orbit-heading');

  const dot = createOrbitDot();
  const firstElement = heading.firstElementChild;
  const leadingIcon = firstElement && firstElement.tagName.toLowerCase() === 'svg';

  if (leadingIcon && firstElement.nextSibling) {
    heading.insertBefore(dot, firstElement.nextSibling);
  } else {
    heading.insertBefore(dot, heading.firstChild);
  }

  accentLastWord(heading);
  heading.dataset.orbitHeadingReady = '1';
};

const enhanceHeadings = (root) => {
  if (!root) {
    return;
  }

  root.querySelectorAll(ORBIT_HEADING_SELECTOR).forEach(enhanceHeading);
};

function MainLayout() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(() => window.sessionStorage.getItem('efm.sidebar.mobileOpen') === '1');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [routeSkeleton, setRouteSkeleton] = useState(true);
  const [theme, setTheme] = useState(() => getStoredTheme());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = window.localStorage.getItem('efm.sidebar.collapsed');
    return saved === '1';
  });
  const { user } = useAuth();
  const { t } = useI18n();
  const location = useLocation();
  const innerContentRef = useRef(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const protectedPath = location.pathname + location.search + location.hash;
    const nonPersistent = ['/', '/login', '/profile-setup'];

    if (!nonPersistent.includes(location.pathname)) {
      window.sessionStorage.setItem('efm.lastProtectedPath', protectedPath);
    }
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const navEntry = window.performance.getEntriesByType?.('navigation')?.[0];
    const isReload = navEntry?.type === 'reload';
    const lastProtectedPath = window.sessionStorage.getItem('efm.lastProtectedPath');

    if (isReload && location.pathname === '/dashboard' && lastProtectedPath && lastProtectedPath !== '/dashboard') {
      navigate(lastProtectedPath, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    window.sessionStorage.setItem('efm.sidebar.mobileOpen', mobileOpen ? '1' : '0');
  }, [mobileOpen]);

  useEffect(() => {
    if (hasMountedRef.current) {
      setMobileOpen(false);
      setMobileSearchOpen(false);
    } else {
      hasMountedRef.current = true;
    }

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
    const root = document.documentElement;

    const syncModalOffset = () => {
      const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
      if (!isDesktop) {
        root.style.setProperty('--efm-modal-left-offset', '0px');
        return;
      }

      const sidebar = document.querySelector('.lovable-sidebar');
      const sidebarWidth = sidebar?.getBoundingClientRect().width || (sidebarCollapsed ? 68 : 260);
      root.style.setProperty('--efm-modal-left-offset', `${Math.round(sidebarWidth)}px`);
    };

    syncModalOffset();
    window.addEventListener('resize', syncModalOffset);

    return () => {
      window.removeEventListener('resize', syncModalOffset);
      root.style.removeProperty('--efm-modal-left-offset');
    };
  }, [sidebarCollapsed]);

  useEffect(() => {
    setAppTheme(theme);
  }, [theme]);

  useEffect(() => subscribeToThemeChange(setTheme), []);

  useEffect(() => {
    if (routeSkeleton || !innerContentRef.current) {
      return undefined;
    }

    const root = innerContentRef.current;
    enhanceHeadings(root);

    const observer = new MutationObserver(() => {
      enhanceHeadings(root);
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [routeSkeleton, location.pathname]);

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
