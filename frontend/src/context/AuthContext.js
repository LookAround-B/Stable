import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, isAuthenticated, getCachedUser, setCachedUser } from '../services/authService';

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
    // Refresh user data from API in the background
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } finally {
        setLoading(false);
      }
    };

    refreshUser();
  }, []);

  const login = (userData) => {
    setUser(userData);
    setCachedUser(userData);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = {
    user,
    loading,
    login,
    logout,
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
