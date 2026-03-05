import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle, setToken } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';

/* ── Eye toggle icon ─────────────────────────────────────── */
const EyeIcon = ({ open }) => open ? (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
) : (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

/* ── Google black icon ───────────────────────────────────── */
const GoogleBlackIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 15.933 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
  </svg>
);

/* ════════════════════════════════════════════════════════════
   LoginPage
   ════════════════════════════════════════════════════════════ */
const LoginPage = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const navigate  = useNavigate();
  const { login } = useAuth();

  /* ── Handlers ──────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await loginWithEmail(email, password);
      if (response.data.token) {
        setToken(response.data.token);
        login(response.data.user);
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        // useGoogleLogin returns an access token instead of a credential JWT, 
        // passing it to the backend mapping.
        // Assuming your backend supports this or you adapt it to use token_info.
        const response = await loginWithGoogle(tokenResponse.access_token);
        if (response.data.token) {
          setToken(response.data.token);
          login(response.data.user);
          navigate('/');
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Google sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign-in failed. Please try again.')
  });

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="lp-split-root">
      {/* ── Left Pane (Image) ── */}
      <div className="lp-left-pane">
        <div className="lp-left-content">
          <img src="/EFM.jpg" alt="EFM Logo" className="lp-left-logo" />
        </div>
      </div>

      {/* ── Right Pane (Login Form) ── */}
      <div className="lp-right-pane">
        <main className="lp-main">
          {/* ═══ LOGIN CARD ═══════════════════════════════════ */}
          <div className="lp-card">
            {/* ── Branding ── */}
            <header className="lp-brand">
              <div className="lp-monogram" aria-label="EFM logo">EFM</div>
              <p className="lp-subtitle">Equestrian Facility Management</p>
            </header>

            {/* ── Form ── */}
            <form onSubmit={handleSubmit} className="lp-form" noValidate>
              {/* Email */}
              <div className="lp-field">
                <label htmlFor="lp-email" className="lp-label">Email address</label>
                <input
                  id="lp-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="lp-input"
                />
              </div>

              {/* Password */}
              <div className="lp-field">
                <label htmlFor="lp-password" className="lp-label">Password</label>
                <div className="lp-pass-wrap">
                  <input
                    id="lp-password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="lp-input lp-input-pass"
                  />
                  <button
                    type="button"
                    className="lp-eye"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                  >
                    <EyeIcon open={showPass} />
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="lp-error" role="alert">
                  <span className="lp-error-dot" aria-hidden="true" />
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="lp-btn-primary"
              >
                {loading ? (
                  <span className="lp-spinner" aria-hidden="true" />
                ) : null}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>

            {/* Divider */}
            <div className="lp-divider" aria-hidden="true">
              <span>or</span>
            </div>

            {/* Google */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleCustomGoogleLogin()}
              className="lp-btn-google"
            >
              <GoogleBlackIcon />
            </button>

          </div>
          {/* ═══ END CARD ════════════════════════════════════ */}

          <p className="lp-footer">Powered by LookAround</p>

        </main>
      </div>
    </div>
  );
};

export default LoginPage;
