import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { RecaptchaVerifier, signInWithPhoneNumber, PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import './userlogin.css';

const UserLogin = () => {
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
    let retryCount = 0;
    const maxRetries = 3;

    const initRecaptcha = () => {
      try {
        if (recaptchaVerifier) return;
        const container = document.getElementById('user-recaptcha-container');
        if (!container) {
          // Wait until the container is actually in the DOM
          retryCount++;
          if (retryCount < maxRetries) {
            setTimeout(initRecaptcha, 300);
          } else {
            console.warn('reCAPTCHA container not found yet, extending retries...');
            setTimeout(initRecaptcha, 800);
          }
          return;
        }

        console.log('Initializing reCAPTCHA...');
        const verifier = new RecaptchaVerifier(auth, container, {
          size: 'invisible',
          callback: () => console.log('User reCAPTCHA solved'),
          'expired-callback': () => console.log('User reCAPTCHA expired')
        });

        // Ensure it's rendered before use
        verifier.render().catch(() => {});
        setRecaptchaVerifier(verifier);
        console.log('reCAPTCHA initialized successfully');
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        retryCount++;
        if (retryCount < maxRetries) {
          setTimeout(initRecaptcha, 1000);
        } else {
          setError('Failed to initialize reCAPTCHA. Please refresh the page.');
        }
      }
    };

    // Delay initialization to ensure DOM is ready
    const timer = setTimeout(() => {
      initRecaptcha();
    }, 1000);

    return () => {
      clearTimeout(timer);
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (error) {
          console.log('Error clearing reCAPTCHA:', error);
        }
      }
    };
  }, []);

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
      setError('reCAPTCHA not initialized. Please wait a moment and try again.');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const phoneNumber = `+91${mobileNumber}`;
      console.log('User sending OTP to:', phoneNumber);
      
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      setVerificationId(confirmationResult.verificationId);
      setIsOtpSent(true);
      setSuccess(`OTP sent successfully to +91 ${mobileNumber}`);
      console.log('User OTP sent successfully, verificationId:', confirmationResult.verificationId);
    } catch (err) {
      console.error('User error sending OTP:', err);
      
      // Handle specific Firebase errors
      let errorMessage = 'Failed to send OTP. Please try again.';
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number. Please check and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Too many attempts. Please wait a few minutes and try again.';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }
      
      setError(errorMessage);
      
      // Reset reCAPTCHA on error
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
          setRecaptchaVerifier(null);
        } catch (clearError) {
          console.log('Error clearing reCAPTCHA:', clearError);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP using Firebase Phone Authentication
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    console.log('User OTP entered:', otp);
    console.log('User OTP length:', otp.length);
    
    if (otp.length !== 6) {
      console.log('User OTP validation failed - length is not 6');
      setError('Please enter a valid 6-digit OTP');
      return;
    }

    if (!verificationId) {
      setError('No verification ID found. Please resend OTP.');
      return;
    }

    console.log('User OTP validation passed, verifying with Firebase...');
    setIsLoading(true);
    setError('');
    
    try {
      console.log('User verifying OTP with Firebase...');
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      const result = await signInWithCredential(auth, credential);
      
      console.log('User Firebase Phone Authentication successful!');
      console.log('User:', result.user);
      
      // Set success message
      setSuccess('Login successful! Welcome to Buddy!');
      
      // Redirect to userinfo page after successful authentication
      console.log('Redirecting user to userinfo page...');
      
      // Clean up reCAPTCHA before redirect to prevent errors
      if (recaptchaVerifier) {
        try {
          recaptchaVerifier.clear();
        } catch (err) {
          console.log('reCAPTCHA cleanup error (safe to ignore):', err);
        }
      }
      
      // After successful auth, check if user profile already exists
      const uid = result.user.uid;
      let shouldGoToHome = false;
      try {
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);
        shouldGoToHome = userDocSnap.exists();
      } catch (checkError) {
        console.warn('Could not check existing user profile, proceeding to profile setup:', checkError);
      }

      if (shouldGoToHome) {
        console.log('Existing user profile found. Redirecting to /home');
        navigate('/home', {
          replace: true,
          state: { uid, mobileNumber, verified: true, userType: 'customer' }
        });
      } else {
        console.log('No existing user profile. Redirecting to /userinfo');
        const targetUrl = `/userinfo?mobile=${encodeURIComponent(mobileNumber)}&verified=true&uid=${encodeURIComponent(uid)}&userType=customer`;
        navigate(targetUrl, {
          replace: true,
          state: {
            mobileNumber,
            verified: true,
            uid,
            userType: 'customer'
          }
        });
      }
      
    } catch (err) {
      console.error('User Firebase OTP verification error:', err);
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
    <div className="login-container">
      <div className="login-background">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>
      
      <div className="login-card">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-placeholder">
            <img 
              src="/buddy_logo.png" 
              alt="Buddy Logo" 
              className="buddy-logo"
              width="80" 
              height="80"
            />
          </div>
          <h1 className="app-title">Buddy</h1>
          <p className="app-subtitle">Welcome back! Please sign in to continue</p>
        </div>

        {/* Login Form */}
        <form className="login-form" onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp}>
          {!isOtpSent ? (
            // Mobile Number Input
            <div className="input-group">
              <label htmlFor="mobile" className="input-label">
                Mobile Number
              </label>
              <div className="input-wrapper">
                <div className="country-code">+91</div>
                <input
                  type="tel"
                  id="mobile"
                  className="input-field"
                  placeholder="Enter your mobile number"
                  value={mobileNumber}
                  onChange={handleMobileChange}
                  maxLength="10"
                  required
                />
              </div>
              <div className="input-helper">
                We'll send you a verification code
              </div>
            </div>
          ) : (
            // OTP Input
            <div className="input-group">
              <label htmlFor="otp" className="input-label">
                Verification Code
              </label>
              <input
                type="tel"
                id="otp"
                className="input-field otp-field"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={handleOtpChange}
                maxLength="6"
                required
              />
              <div className="input-helper">
                Code sent to +91 {mobileNumber}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="message error-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zM7 3h2v6H7V3zm0 8h2v2H7v-2z"/>
              </svg>
              {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="message success-message">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm3.5 6L7 10.5 4.5 8 5.91 6.59 7 7.68l3.59-3.59L12 5.5z"/>
              </svg>
              {success}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            className={`submit-button ${isLoading ? 'loading' : ''}`}
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="loading-spinner"></div>
            ) : (
              <span>{isOtpSent ? 'Verify & Login' : 'Send OTP'}</span>
            )}
          </button>

          {/* Resend OTP */}
          {isOtpSent && (
            <div className="resend-section">
              <span>Didn't receive the code? </span>
              <button
                type="button"
                className="resend-button"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </div>
          )}
        </form>

        {/* Login as Buddy Button */}
        <div className="buddy-login-section">
          <div className="divider">
            <span>or</span>
          </div>
          <button 
            className="buddy-login-button"
            onClick={() => navigate('/buddy-login')}
            type="button"
          >
            <div className="buddy-button-content">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 6.5V7.5C15 8.3 14.3 9 13.5 9S12 8.3 12 7.5V6.5L6 7V9C6 10.1 6.9 11 8 11V16.5C8 17.3 8.7 18 9.5 18S11 17.3 11 16.5V13H13V16.5C13 17.3 13.7 18 14.5 18S16 17.3 16 16.5V11C17.1 11 18 10.1 18 9H21Z"/>
              </svg>
              <span>Login as a Buddy</span>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
        </div>
        
        {/* reCAPTCHA Container (invisible) */}
        <div id="user-recaptcha-container"></div>
      </div>
    </div>
  );
};

export default UserLogin;