import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import './buddy_Login.css';

const BuddyLogin = () => {
  const navigate = useNavigate();
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [recaptchaVerifier, setRecaptchaVerifier] = useState(null);

  // Initialize reCAPTCHA
  useEffect(() => {
    const initRecaptcha = () => {
      try {
        if (recaptchaVerifier) return;
        const container = document.getElementById('recaptcha-container');
        if (!container) {
          setTimeout(initRecaptcha, 300);
          return;
        }
        const verifier = new RecaptchaVerifier(auth, container, {
          size: 'invisible',
          callback: () => console.log('reCAPTCHA solved'),
          'expired-callback': () => console.log('reCAPTCHA expired')
        });
        verifier.render().catch(() => {});
        setRecaptchaVerifier(verifier);
      } catch (e) {
        console.error('Buddy recaptcha init error', e);
      }
    };

    initRecaptcha();
    
    return () => {
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
      }
    };
  }, [recaptchaVerifier]);

  // Handle mobile number input
  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 10) {
      setMobileNumber(value);
      setError('');
    }
  };

  // Handle OTP input
  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Only allow digits
    if (value.length <= 6) {
      setOtp(value);
      setError('');
    }
  };

  // Send OTP using Firebase Phone Authentication
  const handleSendOtp = async (e) => {
    e.preventDefault();
    
    if (mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    if (!recaptchaVerifier) {
      setError('reCAPTCHA not initialized. Please refresh the page.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const phoneNumber = `+91${mobileNumber}`;
      console.log('Sending OTP to:', phoneNumber);
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      setIsOtpSent(true);
      setSuccess(`OTP sent successfully to +91 ${mobileNumber}`);
      console.log('OTP sent successfully, verificationId:', confirmationResult.verificationId);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError(`Failed to send OTP: ${err.message}`);
      
      // Reset reCAPTCHA on error
      if (recaptchaVerifier) {
        recaptchaVerifier.clear();
        setRecaptchaVerifier(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP using Firebase Phone Authentication
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    console.log('OTP entered:', otp);
    console.log('OTP length:', otp.length);
    
    if (otp.length !== 6) {
      console.log('OTP validation failed - length is not 6');
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      setError('No verification ID found. Please resend OTP.');
      return;
    }

    console.log('OTP validation passed, verifying with Firebase...');
    setIsLoading(true);
    setError('');
    
    try {
      console.log('Verifying OTP with Firebase...');
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      
      console.log('Firebase Phone Authentication successful!');
      console.log('User:', result.user);
      
      // Set success message
      setSuccess('Welcome Buddy! Login successful!');
      
      // Redirect to Buddy Info after successful Firebase authentication
      console.log('Redirecting to /buddy-info...');
      const targetUrl = `/buddy-info?mobile=${encodeURIComponent(mobileNumber)}&verified=true&uid=${encodeURIComponent(result.user.uid)}&userType=buddy`;
      navigate(targetUrl, {
        replace: true,
        state: {
          mobileNumber,
          verified: true,
          uid: result.user.uid,
          userType: 'buddy',
          fromLogin: true
        }
      });
      
    } catch (err) {
      console.error('Firebase OTP verification error:', err);
      setError(`Invalid OTP: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess('OTP resent successfully!');
    } catch (err) {
      setError('Failed to resend OTP. Please try again.');
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
        {/* Back Button */}
        <button 
          className="back-to-user-button"
          onClick={() => navigate('/')}
          type="button"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
          <span>Back to User Login</span>
        </button>

        {/* Logo Section */}
        <div className="buddy-logo-section">
          <div className="buddy-logo-placeholder">
            <img 
              src="/buddy_logo.png" 
              alt="Buddy Logo" 
              className="buddy-logo-img"
              width="90" 
              height="90"
            />
          </div>
          <h1 className="buddy-app-title">Buddy Partner</h1>
          <p className="buddy-app-subtitle">Join as a service provider and grow your business</p>
          <div className="buddy-badge">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
            </svg>
            <span>Partner Login</span>
          </div>
        </div>

        {/* Login Form */}
        <form className="buddy-login-form" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp}>
          {!isOtpSent ? (
            // Mobile Number Input
            <div className="buddy-input-group">
              <label htmlFor="buddy-mobile" className="buddy-input-label">
                Partner Mobile Number
              </label>
              <div className="buddy-input-wrapper">
                <div className="buddy-country-code">+91</div>
                <input
                  type="tel"
                  id="buddy-mobile"
                  className="buddy-input-field"
                  placeholder="Enter your registered mobile number"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  maxLength="10"
                  required
                />
              </div>
              <div className="buddy-input-helper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
                </svg>
                We'll send a verification code to your partner account
              </div>
            </div>
          ) : (
            // OTP Input
            <div className="buddy-input-group">
              <label htmlFor="buddy-otp" className="buddy-input-label">
                Verification Code
              </label>
              <input
                type="tel"
                id="buddy-otp"
                className="buddy-input-field buddy-otp-field"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleOtpChange}
                maxLength="6"
                required
              />
              <div className="buddy-input-helper">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5V11C3 16.55 6.84 21.74 12 23C17.16 21.74 21 16.55 21 11V5L12 1M10 17L6 13L7.41 11.59L10 14.17L16.59 7.58L18 9L10 17Z"/>
                </svg>
                Secure code sent to +91 {mobileNumber}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="buddy-message buddy-error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM7 3h2v6H7V3zm0 8h2v2H7v-2z"/>
              </svg>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="buddy-message buddy-success-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 6L7 10.5 4.5 8 5.91 6.59 7 7.68l3.59-3.59L12 5.5z"/>
              </svg>
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`buddy-submit-button ${isLoading ? 'buddy-loading' : ''}`}
            disabled={isLoading}
            onClick={(e) => {
              console.log('Button clicked!');
              console.log('isOtpSent:', isOtpSent);
              console.log('Current OTP:', otp);
              if (isOtpSent) {
                console.log('Calling handleVerifyOtp...');
                handleVerifyOtp(e);
              } else {
                console.log('Calling handleSendOtp...');
                handleSendOtp(e);
              }
            }}
          >
            {isLoading ? (
              <div className="buddy-loading-spinner"></div>
            ) : (
              <div className="buddy-button-content">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
                </svg>
                <span>{isOtpSent ? 'Verify & Start Earning' : 'Send Verification Code'}</span>
              </div>
            )}
          </button>

          {/* Resend OTP */}
          {isOtpSent && (
            <div className="buddy-resend-section">
              <span>Didn't receive the code? </span>
              <button
                type="button"
                className="buddy-resend-button"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </div>
          )}
        </form>

        {/* Benefits Section */}
        <div className="buddy-benefits">
          <h3>Why join as a Buddy Partner?</h3>
          <div className="buddy-benefits-list">
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14C5.9 14 5 13.1 5 12S5.9 10 7 10 9 10.9 9 12 8.1 14 7 14M12.6 10C11.8 7.7 9.6 6 7 6S2.2 7.7 1.4 10H12.6M16 6L18.29 8.29L22.59 4L24 5.41L18.29 11.12L14.59 7.41L16 6M1.4 14C2.2 16.3 4.4 18 7 18S11.8 16.3 12.6 14H1.4Z"/>
              </svg>
              <span>Flexible working hours</span>
            </div>
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 15H9C9 16.08 10.37 17 12 17S15 16.08 15 15C15 13.9 13.96 13.5 11.76 12.97C9.64 12.44 7 11.78 7 9C7 7.21 8.47 5.69 10.5 5.18V3H13.5V5.18C15.53 5.69 17 7.21 17 9H15C15 7.92 13.63 7 12 7S9 7.92 9 9C9 10.1 10.04 10.5 12.24 11.03C14.36 11.56 17 12.22 17 15C17 16.79 15.53 18.31 13.5 18.82V21H10.5V18.82C8.47 18.31 7 16.79 7 15Z"/>
              </svg>
              <span>Earn competitive rates</span>
            </div>
            <div className="buddy-benefit-item">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
              </svg>
              <span>Build your reputation</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="buddy-login-footer">
          <p>By joining as a partner, you agree to our Partner Terms and Privacy Policy</p>
        </div>
        
        {/* reCAPTCHA Container (invisible) */}
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default BuddyLogin;