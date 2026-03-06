import React from 'react';
import SearchBar from './SearchBar';

const Navigation = ({ onToggleSidebar, sidebarOpen }) => {
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
      </div>
      <div className="nav-quote-mobile">
        &ldquo;Horses Teaches Us About Life, Patience, and Love.&rdquo;
      </div>
    </nav>
  );
};

export default Navigation;
