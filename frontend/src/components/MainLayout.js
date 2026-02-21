import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import '../styles/MainLayout.css';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // Close sidebar on route change (mobile)
  React.useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="main-layout">
      <Navigation onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
      <div className="layout-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <NotificationCenter />
    </div>
  );
};

export default MainLayout;
