export const clearStoredAuth = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

export const isAuthenticationFailure = (error) => {
  const status = error?.response?.status;
  const message = String(error?.response?.data?.error || '').toLowerCase();

  if (status === 401) {
    return true;
  }

  if (status !== 403) {
    return false;
  }

  return (
    message.includes('invalid or expired token') ||
    message.includes('access token required') ||
    message.includes('no authorization header')
  );
};

export const handleAuthenticationFailure = () => {
  clearStoredAuth();

  if (typeof window === 'undefined') {
    return;
  }

  if (window.location.pathname !== '/login') {
    window.location.assign('/login');
  }
};
