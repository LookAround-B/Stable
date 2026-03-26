import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SplashScreen from '../components/SplashScreen';

/**
 * SplashPage — Shows the EFM splash animation.
 * Always plays when visiting '/' and then navigates to /login.
 */
export default function SplashPage() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();

  const handleSplashFinish = () => {
    setShowSplash(false);
    navigate('/login', { replace: true });
  };

  if (!showSplash) return null;
  return <SplashScreen onFinish={handleSplashFinish} />;
}
