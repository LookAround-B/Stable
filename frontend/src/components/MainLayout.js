import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import Navigation from './Navigation';
import Sidebar from './Sidebar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    if (innerContentRef.current) {
      innerContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="main-layout">
      <Navigation onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="layout-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content">
          <div className="main-content-inner" ref={innerContentRef}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
