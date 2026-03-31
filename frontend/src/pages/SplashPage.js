import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '../components/SplashScreen';
import { isAuthenticated } from '../services/authService';

/**
 * SplashPage — Shows the EFM splash animation.
 * If already logged in, redirects to /dashboard.
 * Otherwise plays splash and navigates to /login.
 */
export default function SplashPage() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  const handleSplashFinish = () => {
    setShowSplash(false);
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  if (!showSplash) return null;
  return <SplashScreen onFinish={handleSplashFinish} />;
}
