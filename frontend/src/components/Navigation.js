import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/authService';
import '../styles/Navigation.css';

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
          <h1>Stable Management</h1>
        </div>
      </div>
      <div className="nav-right">
        <button onClick={handleLogout} className="btn-logout">
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
