import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle, setToken } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';

/* ── Demo accounts ───────────────────────────────────────── */
const DEMO_ACCOUNTS = [
  { role: 'Admin',    email: 'admin@test.com',   password: 'password123', icon: '◈' },
  { role: 'Guard',    email: 'guard@test.com',   password: 'password123', icon: '◉' },
  { role: 'Groom',    email: 'groom@test.com',   password: 'password123', icon: '◎' },
  { role: 'Jamedar',  email: 'jamedar@test.com', password: 'password123', icon: '◍' },
  { role: 'Manager',  email: 'manager@test.com', password: 'password123', icon: '◐' },
];

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

/* ════════════════════════════════════════════════════════════
   LoginPage
   ════════════════════════════════════════════════════════════ */
const LoginPage = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPass, setShowPass]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [activeDemoIdx, setActiveDemoIdx] = useState(null);

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

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    setError('');
    try {
      const response = await loginWithGoogle(credentialResponse.credential);
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
  };

  const handleDemoClick = (account, idx) => {
    setEmail(account.email);
    setPassword(account.password);
    setActiveDemoIdx(idx);
    setError('');
  };

  /* ── Render ────────────────────────────────────────────── */
  return (
    <div className="lp-split-root">
      {/* ── Left Pane (Image) ── */}
      <div className="lp-left-pane">
        <div className="lp-left-content">
          <img src="/EFM.png" alt="EFM Logo" className="lp-left-logo" />
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
            <div className="lp-google-wrap">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Google sign-in failed. Please try again.')}
                theme="outline"
                size="large"
                width="100%"
                text="signin_with"
              />
            </div>

          </div>
          {/* ═══ END CARD ════════════════════════════════════ */}

          {/* ═══ DEMO CREDENTIALS ════════════════════════════ */}
          <section className="lp-demo" aria-label="Test credentials">
            <p className="lp-demo-title">
              <span className="lp-demo-line" aria-hidden="true" />
              Test Credentials
              <span className="lp-demo-line" aria-hidden="true" />
            </p>
            <div className="lp-demo-grid">
              {DEMO_ACCOUNTS.map((acc, idx) => (
                <button
                  key={acc.email}
                  type="button"
                  className={`lp-demo-row${activeDemoIdx === idx ? ' lp-demo-row--active' : ''}`}
                  onClick={() => handleDemoClick(acc, idx)}
                  aria-label={`Use ${acc.role} credentials`}
                >
                  <span className="lp-demo-icon" aria-hidden="true">{acc.icon}</span>
                  <span className="lp-demo-info">
                    <span className="lp-demo-role">{acc.role}</span>
                    <span className="lp-demo-email">{acc.email}</span>
                  </span>
                  <span className="lp-demo-tap" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </section>

          <p className="lp-footer">EFM · Equestrian Facility Management System · v2.0</p>

        </main>
      </div>
    </div>
  );
};

export default LoginPage;
