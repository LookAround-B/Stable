import React, { useState, useEffect } from 'react';
import { loginWithEmail, loginWithGoogle, setToken, isAuthenticated } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, LogIn, Loader2 } from 'lucide-react';
import { ShaderAnimation } from '../components/ShaderAnimation';

/* ── Google branded icon ─────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

/* ════════════════════════════════════════════════════════════
   LoginPage 
   ════════════════════════════════════════════════════════════ */
const LoginPage = () => {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const navigate  = useNavigate();
  const { login } = useAuth();

  const getErrorMessage = (err) => {
    if (err?.response?.data?.error) {
      return err.response.data.error;
    }

    if (err?.isApiRoutingError) {
      return 'Login is unavailable right now. The app is reaching the frontend instead of the auth API.';
    }

    return 'Invalid credentials. Please try again.';
  };

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  /* ── Email/Password ────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await loginWithEmail(email, password);
      if (!response?.data?.token || !response?.data?.user) {
        throw new Error('Login response did not include session data');
      }

      document.activeElement?.blur?.();
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      setToken(response.data.token);
      login(response.data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  /* ── Google Login ──────────────────────────────────────── */
  const handleCustomGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      setError('');
      try {
        const response = await loginWithGoogle(tokenResponse.access_token);
        if (!response?.data?.token || !response?.data?.user) {
          throw new Error('Google login response did not include session data');
        }

        document.activeElement?.blur?.();
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        setToken(response.data.token);
        login(response.data.user);
        navigate('/dashboard');
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    onError: () => setError('Google sign-in failed. Please try again.')
  });

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#050505] overflow-hidden font-sans">

      {/* ── Background Shader ── */}
      <div className="absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
        <ShaderAnimation />
      </div>

      {/* ambient glow behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 blur-[120px] pointer-events-none rounded-full" />

      {/* ═══ LOGIN CARD ════════════════════════════════════ */}
      <div className="w-full max-w-[420px] z-10 mx-4
                      bg-[#0a0a0a] backdrop-blur-xl
                      border border-white/5
                      rounded-3xl p-8 sm:p-10
                      shadow-2xl">

        {/* Header */}
        <header className="text-center mb-10">
          <div className="font-serif italic font-bold text-[64px] tracking-tight text-white mb-3"
               style={{ fontFamily: "'Cormorant Garamond', 'Playfair Display', serif", lineHeight: 1 }}>
            EFM
          </div>
          <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.1em] uppercase text-[#888]">
            Equestrian Facility Management
          </p>
        </header>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>

          {/* Email */}
          <div className="space-y-2.5">
            <label htmlFor="login-email"
                   className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              disabled={loading}
              className="w-full h-[54px] px-4 rounded-xl
                         bg-[#151515] border border-white/5
                         text-white text-[15px]
                         placeholder:text-[#444]
                         focus:outline-none focus:ring-1 focus:ring-[#b666f7]/50 focus:border-[#b666f7]/50
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all"
              style={{
                WebkitBoxShadow: '0 0 0px 1000px #151515 inset',
                WebkitTextFillColor: '#ffffff',
                transition: 'background-color 5000s ease-in-out 0s'
              }}
            />
          </div>

          {/* Password */}
          <div className="space-y-2.5">
            <label htmlFor="login-password"
                   className="text-[10px] font-bold uppercase tracking-widest text-[#888]">
              Password
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPass ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className="w-full h-[54px] px-4 pr-12 rounded-xl
                           bg-[#151515] border border-white/5
                           text-white text-[15px] tracking-[0.2em]
                           placeholder:text-[#444] placeholder:tracking-normal
                           focus:outline-none focus:ring-1 focus:ring-[#b666f7]/50 focus:border-[#b666f7]/50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all"
                style={{
                  WebkitBoxShadow: '0 0 0px 1000px #151515 inset',
                  WebkitTextFillColor: '#ffffff',
                  transition: 'background-color 5000s ease-in-out 0s'
                }}
              />
              <button
                type="button"
                className="absolute right-0 top-0 h-[54px] w-[54px]
                           flex items-center justify-center
                           text-[#555] hover:text-[#bbb]
                           transition-colors rounded-r-xl"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPass
                  ? <EyeOff className="w-[20px] h-[20px]" />
                  : <Eye className="w-[20px] h-[20px]" />
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-4 py-3
                            rounded-xl text-[13px] font-medium
                            bg-red-500/10 text-red-500
                            border border-red-500/20"
                 role="alert">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="btn-save-primary w-full mt-3"
          >
            {loading
              ? <Loader2 className="w-[18px] h-[18px] animate-spin" />
              : <LogIn className="w-[18px] h-[18px]" />
            }
            {loading ? 'Signing in…' : 'Sign In'}
          </button>

        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-8">
          <span className="flex-1 h-px bg-white/5" />
          <span className="text-[10px] font-bold tracking-widest text-[#555]">OR</span>
          <span className="flex-1 h-px bg-white/5" />
        </div>

        {/* Google Sign-In */}
        <button
          type="button"
          disabled={loading}
          onClick={() => handleCustomGoogleLogin()}
          className="w-full h-[52px] rounded-xl
                     bg-[#111] border border-white/5
                     text-white text-[14px] font-medium tracking-wide
                     flex items-center justify-center gap-3
                     hover:bg-[#1a1a1a] hover:border-white/10
                     active:scale-[0.98]
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        {/* Forgot password */}
        <div className="mt-8 text-center text-[13px] text-[#555]">
          <p className="hover:text-white cursor-pointer transition-colors inline-flex items-center justify-center">
            Forgot password?
          </p>
        </div>

        {/* Watermark */}
        <div className="mt-8 text-center text-[10px] font-medium text-[#333] tracking-widest uppercase mb-[-16px]">
          Powered by LookAround
        </div>

      </div>
      {/* ═══ END CARD ══════════════════════════════════════ */}
    </div>
  );
};

export default LoginPage;
