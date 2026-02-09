import React from 'react';
import { Outlet } from 'react-router-dom';
import Navigation from './Navigation';
import Sidebar from './Sidebar';
import NotificationCenter from './NotificationCenter';
import '../styles/MainLayout.css';

const MainLayout = () => {

  return (
    <div className="main-layout">
      <Navigation />
      <div className="layout-container">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <NotificationCenter />
    </div>
  );
};

export default MainLayout;
