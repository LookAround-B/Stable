import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import { LogOut } from 'lucide-react';
import SearchBar from './SearchBar';

const Navigation = ({ onToggleSidebar, sidebarOpen }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navigation">
      <div className="nav-left">
        <button className={`hamburger-btn ${sidebarOpen ? 'active' : ''}`} onClick={onToggleSidebar} aria-label="Toggle menu">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div className="nav-brand">
          <div className="nav-logo-circle" />
          <h1>EFM</h1>
        </div>
      </div>
      
      <div className="nav-center">
      </div>

      <div className="nav-right">
        <SearchBar />
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          <LogOut size={15} strokeWidth={2} />
          <span>Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
