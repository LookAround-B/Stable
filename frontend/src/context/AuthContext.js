import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getCachedUser, setCachedUser } from '../services/authService';
import { clearStoredAuth } from '../services/apiAuthGuard';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  // Initialize user from localStorage cache immediately (no flash)
  const [user, setUser] = useState(() => {
    if (isAuthenticated()) {
      return getCachedUser();
    }
    return null;
  });
  // If we have a cached user, we're not in a loading state
  const [loading, setLoading] = useState(() => {
    if (isAuthenticated()) {
      return !getCachedUser();
    }
    return false;
  });

  useEffect(() => {
    const refreshUser = async () => {
      try {
        if (isAuthenticated()) {
          const response = await getCurrentUser();
          const freshUser = response.data;
          setUser(freshUser);
          setCachedUser(freshUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        // If token is invalid, clear everything
        setUser(null);
        clearStoredAuth();
      } finally {
        setLoading(false);
      }
    };

    refreshUser();

    const handleStorage = (event) => {
      if (!(event.key === 'token' || event.key === 'user')) {
        return;
      }

      if (!isAuthenticated()) {
        setUser(null);
        setLoading(false);
        return;
      }

      const cachedUser = getCachedUser();
      if (cachedUser) {
        setUser(cachedUser);
        setLoading(false);
        return;
      }

      setUser(null);
      setLoading(true);
      refreshUser();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = (userData) => {
    setUser(userData);
    setCachedUser(userData);
  };

  const updateUser = (partialData) => {
    setUser(prev => {
      const updated = { ...prev, ...partialData };
      setCachedUser(updated);
      return updated;
    });
  };

  const logout = () => {
    setUser(null);
    clearStoredAuth();
  };

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
