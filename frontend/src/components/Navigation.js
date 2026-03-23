import React from 'react';
import SearchBar from './SearchBar';
import NotificationCenter from './NotificationCenter';

const Navigation = ({ onToggleSidebar, sidebarOpen, quote }) => {
  return (
    <nav className="navigation mobile-only-nav">
      <div className="nav-left">
        <button className={`hamburger-btn ${sidebarOpen ? 'active' : ''}`} onClick={onToggleSidebar} aria-label="Toggle menu">
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div className={`nav-branding ${sidebarOpen ? 'nav-branding-hidden' : ''}`}>
          <div className="nav-branding-icon"></div>
          <span className="nav-branding-title">EFM</span>
        </div>
      </div>
      <div className="nav-center-mobile">
        <SearchBar />
        <NotificationCenter />
      </div>
      <div className="nav-quote-mobile">
        &ldquo;{quote}&rdquo;
      </div>
    </nav>
  );
};

export default Navigation;
