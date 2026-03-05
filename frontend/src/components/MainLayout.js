import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainContentRef = useRef(null);
  const { user } = useAuth();

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
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="main-layout">
      <Navigation onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="layout-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content" ref={mainContentRef}>
          <Outlet />
        </main>
      </div>
      <NotificationCenter />
    </div>
  );
};

export default MainLayout;
