import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import { LogOut } from 'lucide-react';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const innerContentRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Close sidebar on route change (mobile) and scroll main content to top
  React.useEffect(() => {
    setSidebarOpen(false);
    // Scroll only the main content area to top, not the sidebar
    if (innerContentRef.current) {
      innerContentRef.current.scrollTop = 0;
      setIsScrolled(false);
    }
  }, [location.pathname]);

  const handleScroll = (e) => {
    setIsScrolled(e.target.scrollTop > 0);
  };

  return (
    <div className="main-layout">
      <Navigation onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="layout-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content">
          <header className={`main-header ${isScrolled ? 'scrolled' : ''}`}>
            <div className="main-header-left">
              <span className="nav-quote">&ldquo;Horses Teaches Us About Life, Patience, and Love.&rdquo;</span>
            </div>
            <div className="main-header-right">
              <SearchBar />
              <button onClick={handleLogout} className="btn-logout" title="Logout">
                <LogOut size={15} strokeWidth={2} />
                <span>Logout</span>
              </button>
            </div>
          </header>
          <div className="main-content-inner" ref={innerContentRef} onScroll={handleScroll}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
