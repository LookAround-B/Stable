import apiClient from './apiClient';

export const loginWithEmail = (email, password) => {
  return apiClient.post('/auth/login', { email, password });
};

export const loginWithGoogle = (googleToken) => {
  return apiClient.post('/auth/google', { token: googleToken });
};

export const createProfile = (profileData) => {
  return apiClient.post('/auth/profile', profileData);
};

export const getCurrentUser = () => {
  return apiClient.get('/auth/me');
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const getToken = () => {
  return localStorage.getItem('token');
};

export const isAuthenticated = () => {
  return !!getToken();
};

export const setCachedUser = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

export const getCachedUser = () => {
  try {
    const cached = localStorage.getItem('user');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
};
