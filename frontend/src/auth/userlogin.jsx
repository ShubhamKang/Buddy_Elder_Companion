import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './userlogin.css';

/**
 * Elder (customer) authentication via the backend email/password JWT API.
 *
 * NOTE: This replaces the former Firebase phone-OTP flow. Phone/SMS OTP requires
 * a paid SMS provider and is not part of the free, self-hosted backend, so the
 * login UX is email + password with an inline register toggle.
 */
const UserLogin = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (mode === 'register' && !fullName) {
      setError('Please enter your name.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'login') {
        await login({ email, password });
      } else {
        await register({ email, password, fullName, phone, role: 'ELDER' });
      }
      setSuccess('Welcome to Buddy!');
      // New registrations go to profile setup; returning users to home.
      navigate(mode === 'register' ? '/userinfo' : '/home', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message
        || (err.response?.status === 401 ? 'Invalid email or password.' : 'Something went wrong. Please try again.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="login-card">
        <div className="logo-section">
          <div className="logo-placeholder">
            <img src="/buddy_logo.png" alt="Buddy Logo" className="buddy-logo" width="80" height="80" />
          </div>
          <h1 className="app-title">Buddy</h1>
          <p className="app-subtitle">
            {mode === 'login' ? 'Welcome back! Please sign in to continue' : 'Create your account to get started'}
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="fullName" className="input-label">Full Name</label>
              <div className="input-wrapper">
                <input
                  type="text"
                  id="fullName"
                  className="input-field"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email" className="input-label">Email</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="password" className="input-label">Password</label>
            <div className="input-wrapper">
              <input
                type="password"
                id="password"
                className="input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            {mode === 'register' && (
              <div className="input-helper">At least 8 characters.</div>
            )}
          </div>

          {mode === 'register' && (
            <div className="input-group">
              <label htmlFor="phone" className="input-label">Mobile Number (optional)</label>
              <div className="input-wrapper">
                <div className="country-code">+91</div>
                <input
                  type="tel"
                  id="phone"
                  className="input-field"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="message error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM7 3h2v6H7V3zm0 8h2v2H7v-2z" />
              </svg>
              {error}
            </div>
          )}

          {success && (
            <div className="message success-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 6L7 10.5 4.5 8 5.91 6.59 7 7.68l3.59-3.59L12 5.5z" />
              </svg>
              {success}
            </div>
          )}

          <button type="submit" className={`submit-button ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? <div className="loading-spinner"></div> : <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>}
          </button>

          <div className="resend-section">
            {mode === 'login' ? (
              <>
                <span>New to Buddy? </span>
                <button type="button" className="resend-button" onClick={() => { setMode('register'); setError(''); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                <span>Already have an account? </span>
                <button type="button" className="resend-button" onClick={() => { setMode('login'); setError(''); }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>

        <div className="buddy-login-section">
          <div className="divider"><span>or</span></div>
          <button className="buddy-login-button" onClick={() => navigate('/buddy-login')} type="button">
            <div className="buddy-button-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z" />
              </svg>
              <span>Login as a Buddy</span>
            </div>
          </button>
        </div>

        <div className="login-footer">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default UserLogin;
