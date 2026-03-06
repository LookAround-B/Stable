import React from 'react';

const Navigation = ({ onToggleSidebar, sidebarOpen }) => {
  return (
    <nav className="navigation mobile-only-nav">
      <div className="nav-left">
        <button className={`hamburger-btn ${sidebarOpen ? 'active' : ''}`} onClick={onToggleSidebar} aria-label="Toggle menu">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
      </div>
    </nav>
  );
};

export default Navigation;
