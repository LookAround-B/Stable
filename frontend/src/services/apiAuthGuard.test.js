import {
  clearStoredAuth,
  handleAuthenticationFailure,
  isAuthenticationFailure,
} from './apiAuthGuard';

describe('apiAuthGuard', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('token', 'abc123');
    localStorage.setItem('user', JSON.stringify({ id: 'user-1' }));
  });

  it('detects auth failures from 401 responses and expired-token 403 responses', () => {
    expect(isAuthenticationFailure({ response: { status: 401 } })).toBe(true);
    expect(
      isAuthenticationFailure({
        response: { status: 403, data: { error: 'Invalid or expired token' } },
      })
    ).toBe(true);
    expect(
      isAuthenticationFailure({
        response: { status: 403, data: { error: 'Forbidden: admin access required' } },
      })
    ).toBe(false);
  });

  it('clears stored auth state', () => {
    clearStoredAuth();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('clears auth and redirects to login when auth fails away from the login page', () => {
    const originalLocation = window.location;
    const assign = jest.fn();

    delete window.location;
    window.location = {
      ...originalLocation,
      pathname: '/permissions',
      assign,
    };

    handleAuthenticationFailure();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(assign).toHaveBeenCalledWith('/login');

    window.location = originalLocation;
  });
});
