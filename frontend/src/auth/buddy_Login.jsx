import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import './buddy_Login.css';

/**
 * Buddy (service provider) authentication via the backend email/password JWT API.
 * Replaces the former Firebase phone-OTP flow (see userlogin.jsx note).
 */
const BuddyLogin = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode] = useState('login');
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
        await register({ email, password, fullName, phone, role: 'BUDDY' });
      }
      setSuccess('Welcome, partner!');
      navigate(mode === 'register' ? '/buddy-info' : '/home', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message
        || (err.response?.status === 401 ? 'Invalid email or password.' : 'Something went wrong. Please try again.');
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="buddy-login-container">
      <div className="buddy-login-background">
        <div className="buddy-background-shapes">
          <div className="buddy-shape buddy-shape-1"></div>
          <div className="buddy-shape buddy-shape-2"></div>
          <div className="buddy-shape buddy-shape-3"></div>
          <div className="buddy-shape buddy-shape-4"></div>
        </div>
      </div>

      <div className="buddy-login-card">
        <button className="back-to-user-button" onClick={() => navigate('/')} type="button">
          &larr; Back
        </button>

        <div className="buddy-logo-section">
          <div className="buddy-logo-placeholder">
            <img src="/buddy_logo.png" alt="Buddy Logo" className="buddy-logo-img" width="80" height="80" />
          </div>
          <h1 className="buddy-app-title">Buddy Partner</h1>
          <p className="buddy-app-subtitle">Join as a service provider and grow your business</p>
          <div className="buddy-badge">Partner</div>
        </div>

        <form className="buddy-login-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="buddy-input-group">
              <label htmlFor="buddy-name" className="buddy-input-label">Full Name</label>
              <div className="buddy-input-wrapper">
                <input
                  type="text"
                  id="buddy-name"
                  className="buddy-input-field"
                  placeholder="Enter your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="buddy-input-group">
            <label htmlFor="buddy-email" className="buddy-input-label">Email</label>
            <div className="buddy-input-wrapper">
              <input
                type="email"
                id="buddy-email"
                className="buddy-input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="buddy-input-group">
            <label htmlFor="buddy-password" className="buddy-input-label">Password</label>
            <div className="buddy-input-wrapper">
              <input
                type="password"
                id="buddy-password"
                className="buddy-input-field"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
          </div>

          {mode === 'register' && (
            <div className="buddy-input-group">
              <label htmlFor="buddy-phone" className="buddy-input-label">Mobile Number (optional)</label>
              <div className="buddy-input-wrapper">
                <div className="buddy-country-code">+91</div>
                <input
                  type="tel"
                  id="buddy-phone"
                  className="buddy-input-field"
                  placeholder="Enter your mobile number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="buddy-message buddy-error-message">{error}</div>
          )}
          {success && (
            <div className="buddy-message buddy-success-message">{success}</div>
          )}

          <button type="submit" className={`buddy-submit-button ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? (
              <div className="buddy-loading-spinner"></div>
            ) : (
              <div className="buddy-button-content">
                <span>{mode === 'login' ? 'Sign In' : 'Create Partner Account'}</span>
              </div>
            )}
          </button>

          <div className="buddy-resend-section">
            {mode === 'login' ? (
              <>
                <span>New partner? </span>
                <button type="button" className="buddy-resend-button" onClick={() => { setMode('register'); setError(''); }}>
                  Create an account
                </button>
              </>
            ) : (
              <>
                <span>Already a partner? </span>
                <button type="button" className="buddy-resend-button" onClick={() => { setMode('login'); setError(''); }}>
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>

        <div className="buddy-benefits">
          <h3>Why join as a Buddy Partner?</h3>
          <div className="buddy-benefits-list">
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6S2.2 7.7 1.4 10H12.6M16 6L18.29 8.29L22.59 4L24 5.41L18.29 11.12L14.59 7.41L16 6M1.4 14C2.2 16.3 4.4 18 7 18S11.8 16.3 12.6 14H1.4Z" />
              </svg>
              <span>Flexible working hours</span>
            </div>
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 15H9C9 16.08 10.37 17 12 17S15 16.08 15 15C15 13.9 13.96 13.5 11.76 12.97C9.64 12.44 7 11.78 7 9C7 7.21 8.47 5.69 10.5 5.18V3H13.5V5.18C15.53 5.69 17 7.21 17 9H15C15 7.92 13.63 7 12 7S9 7.92 9 9C9 10.1 10.04 10.5 12.24 11.03C14.36 11.56 17 12.22 17 15C17 16.79 15.53 18.31 13.5 18.82V21H10.5V18.82C8.47 18.31 7 16.79 7 15Z" />
              </svg>
              <span>Earn competitive rates</span>
            </div>
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z" />
              </svg>
              <span>Build your reputation</span>
            </div>
          </div>
        </div>

        <div className="buddy-login-footer">
          <p>By joining as a partner, you agree to our Partner Terms and Privacy Policy</p>
        </div>
      </div>
    </div>
  );
};

export default BuddyLogin;
