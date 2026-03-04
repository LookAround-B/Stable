import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { useAuth } from '../context/AuthContext';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const mainContentRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

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
      {/* Desktop floating user card — outside sidebar so position:fixed works correctly */}
      {user && (
        <div className="floating-user-card desktop-user-card" onClick={() => navigate('/profile')}>
          <div className="floating-user-avatar">
            {user.profileImage
              ? <img src={user.profileImage} alt={user.fullName} className="floating-user-avatar-img" />
              : <span className="floating-user-avatar-initial">{(user.fullName || user.name || 'U').charAt(0).toUpperCase()}</span>
            }
          </div>
          <div className="floating-user-info">
            <div className="floating-user-name">{user.fullName || user.name || 'User'}</div>
            <div className="floating-user-designation">{user.designation || user.role || 'Staff'}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
