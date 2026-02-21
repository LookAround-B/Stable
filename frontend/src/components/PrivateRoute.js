import React from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from './MainLayout';
import PendingApprovalPage from '../pages/PendingApprovalPage';
import { isAuthenticated } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { user, loading } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Show a brief loading state while fetching user data (only on first load with no cache)
  if (loading && !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🐴</div>
          <p style={{ color: '#666', fontSize: '1rem' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Check if user is approved by admin
  if (user && !user.isApproved) {
    return <PendingApprovalPage />;
  }

  return <MainLayout />;
};

export default PrivateRoute;
