import React from 'react';
import { Navigate } from 'react-router-dom';
import MainLayout from './MainLayout';
import PendingApprovalPage from '../pages/PendingApprovalPage';
import { isAuthenticated } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = () => {
  const { user } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is approved by admin
  if (!user?.isApproved) {
    return <PendingApprovalPage />;
  }

  return <MainLayout />;
};

export default PrivateRoute;
