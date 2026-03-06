import React, { useState, useCallback, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { logout } from '../services/authService';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import SearchBar from './SearchBar';

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quote, setQuote] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const innerContentRef = useRef(null);

  const quotes = [
    "To understand the soul of a horse is the closest human beings can come to knowing perfection.",
    "Ask me to show you poetry in motion and I will show you a horse.",
    "A pony is a childhood dream. A horse is an adulthood treasure.",
    "The history of mankind is carried on the back of a horse."
  ];

  const getRandomQuote = () => {
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

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

  // Initialize quote on component mount
  React.useEffect(() => {
    setQuote(getRandomQuote());
  }, []);

  // Close sidebar on route change (mobile) and scroll main content to top, update quote
  React.useEffect(() => {
    setSidebarOpen(false);
    setQuote(getRandomQuote());
    if (innerContentRef.current) {
      innerContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="main-layout">
      <Navigation onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} quote={quote} />
      <div className="layout-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={closeSidebar} />}
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="main-content">
          <header className="main-header desktop-only-header">
            <div className="main-header-left">
              <span className="nav-quote">"{quote}"</span>
            </div>
            <div className="main-header-right">
              <SearchBar />
              <button className="logout-btn" onClick={handleLogout}>
                Logout <LogOut size={16} />
              </button>
            </div>
          </header>
          <div className="main-content-inner" ref={innerContentRef}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
