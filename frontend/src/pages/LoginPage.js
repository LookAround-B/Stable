import React, { useState } from 'react';
import { loginWithEmail, loginWithGoogle, setToken } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import '../styles/LoginPage.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await loginWithEmail(email, password);
      if (response.data.token) {
        setToken(response.data.token);
        // Set user in context
        login(response.data.user);
        navigate('/');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Login failed';
      setError(errorMsg);
      console.error('Login error:', err);
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
      const errorMsg = err.response?.data?.error || 'Google login failed';
      setError(errorMsg);
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <h1>🐴 Equestrian Facility Management</h1>
        <p className="subtitle">Stable Management System</p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" disabled={loading} className="btn-login">
            {loading ? 'Logging in...' : 'Login with Email'}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="google-login-container">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
            />
          </div>
        </form>

        <div className="test-credentials">
          <h3>Test Credentials</h3>
          <p><strong>Admin:</strong></p>
          <code>admin@test.com / password123</code>
          <p><strong>Guard:</strong></p>
          <code>guard@test.com / password123</code>
          <p><strong>Other roles:</strong></p>
          <code>groom@test.com, jamedar@test.com, manager@test.com</code>
        </div>

        <p className="info-text">PRD v2.0 - Equestrian Facility Management System</p>
      </div>
    </div>
  );
};

export default LoginPage;
