// UserInfo.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const UserInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    age: '',
    gender: '',
    email: '',
    mobileNumber: '',
    profilePicture: null
  });

  const [previewImage, setPreviewImage] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Always show userinfo page and pre-fill mobile number if available
  useEffect(() => {
    console.log('UserInfo component mounted');
    console.log('Current location:', location);
    
    const loginState = location.state;
    const urlParams = new URLSearchParams(location.search);
    const mobileFromUrl = urlParams.get('mobile');
    const verified = urlParams.get('verified');
    const uid = urlParams.get('uid');
    const userType = urlParams.get('userType');
    
    console.log('UserInfo - Loading page...');
    console.log('URL params:', {
      mobile: mobileFromUrl,
      verified: verified,
      uid: uid,
      userType: userType
    });
    
    // Pre-fill mobile number if available from URL or state
    const mobileNumber = loginState?.mobileNumber || mobileFromUrl;
    if (mobileNumber) {
      setFormData(prev => ({
        ...prev,
        mobileNumber: mobileNumber
      }));
      console.log('Mobile number pre-filled:', mobileNumber);
    } else {
      console.log('No mobile number found in URL or state');
    }
    
    // Show welcome message if user just completed login
    if (verified === 'true') {
      console.log('User successfully verified and redirected from login');
    }
  }, [location]);

  const genderOptions = [
    { value: 'male', label: 'Male', emoji: '👨' },
    { value: 'female', label: 'Female', emoji: '👩' },
    { value: 'other', label: 'Other', emoji: '🧑' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profilePicture: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!formData.age || formData.age < 13 || formData.age > 100) newErrors.age = 'Please enter valid age (13-100)';
    if (!formData.gender) newErrors.gender = 'Please select gender';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.mobileNumber.trim()) newErrors.mobileNumber = 'Mobile number is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const urlParams = new URLSearchParams(location.search);
      const uid = urlParams.get('uid');
      const userType = urlParams.get('userType') || 'customer';

      let uploadedPhotoURL = null;
      if (formData.profilePicture) {
        const file = formData.profilePicture;
        const safeId = uid || formData.mobileNumber || 'anonymous';
        const objectPath = `profilePictures/${safeId}_${Date.now()}_${file.name}`;
        const objectRef = storageRef(storage, objectPath);
        await uploadBytes(objectRef, file);
        uploadedPhotoURL = await getDownloadURL(objectRef);
      }

      const payload = {
        fullName: formData.fullName.trim(),
        age: Number(formData.age),
        gender: formData.gender,
        email: formData.email.trim(),
        mobileNumber: formData.mobileNumber.trim(),
        photoURL: uploadedPhotoURL,
        userType,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      if (uid) {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
      } else {
        await addDoc(collection(db, 'users'), payload);
      }

      alert('Profile saved successfully! Welcome to Buddy!');
      navigate('/home');
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save your profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    }}>
      <div style={{
        background: 'white',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        maxWidth: '500px',
        width: '100%',
        padding: '40px'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          padding: '40px 30px',
          textAlign: 'center',
          color: 'white',
          borderRadius: '16px 16px 0 0',
          margin: '-40px -40px 30px -40px'
        }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '15px' }}>👋</span>
          <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700' }}>
            Welcome to <span style={{
              background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontWeight: '700'
            }}>BuddyBook</span>
          </h2>
          <p style={{ margin: '0', opacity: '0.9', fontSize: '16px' }}>
            Let's create your profile and get started!
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Picture Upload */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Profile Picture (Optional)</label>
            <div style={{
              position: 'relative',
              border: '2px dashed #ddd',
              borderRadius: '16px',
              padding: '25px',
              textAlign: 'center',
              background: '#fafbfc',
              cursor: 'pointer'
            }}>
              {previewImage ? (
                <div style={{ position: 'relative', display: 'inline-block' }}>
                  <img src={previewImage} alt="Profile Preview" style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '4px solid white',
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)'
                  }} />
                  <button 
                    type="button" 
                    style={{
                      position: 'absolute',
                      top: '-5px',
                      right: '-5px',
                      background: '#ff4757',
                      color: 'white',
                      border: 'none',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    onClick={() => {setPreviewImage(null); setFormData(prev => ({...prev, profilePicture: null}));}}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ padding: '15px' }}>
                  <div style={{ fontSize: '40px', marginBottom: '10px' }}>📸</div>
                  <p style={{ margin: '8px 0 4px 0', fontWeight: '500', color: '#555' }}>Add your photo</p>
                  <small style={{ color: '#888', fontSize: '12px' }}>Optional but recommended</small>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  width: '100%',
                  height: '100%',
                  opacity: '0',
                  cursor: 'pointer'
                }}
              />
            </div>
          </div>

          {/* Name and Age Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '25px' }}>
            <div>
              <label htmlFor="fullName" style={{
                display: 'block',
                marginBottom: '8px',
                color: '#555',
                fontWeight: '600',
                fontSize: '14px'
              }}>Full Name *</label>
              <input
                type="text"
                id="fullName"
                value={formData.fullName}
                onChange={(e) => handleInputChange('fullName', e.target.value)}
                placeholder="Enter your full name"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: `2px solid ${errors.fullName ? '#ff4757' : '#e1e5e9'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  background: errors.fullName ? '#fff5f5' : '#fafbfc'
                }}
              />
              {errors.fullName && <span style={{ color: '#ff4757', fontSize: '12px', marginTop: '5px', display: 'block' }}>{errors.fullName}</span>}
            </div>

            <div>
              <label htmlFor="age" style={{
                display: 'block',
                marginBottom: '8px',
                color: '#555',
                fontWeight: '600',
                fontSize: '14px'
              }}>Age *</label>
              <input
                type="number"
                id="age"
                value={formData.age}
                onChange={(e) => handleInputChange('age', e.target.value)}
                placeholder="25"
                min="13"
                max="100"
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  border: `2px solid ${errors.age ? '#ff4757' : '#e1e5e9'}`,
                  borderRadius: '12px',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                  background: errors.age ? '#fff5f5' : '#fafbfc'
                }}
              />
              {errors.age && <span style={{ color: '#ff4757', fontSize: '12px', marginTop: '5px', display: 'block' }}>{errors.age}</span>}
            </div>
          </div>

          {/* Gender Selection */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Gender *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {genderOptions.map(option => (
                <div
                  key={option.value}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    padding: '20px 15px',
                    border: `2px solid ${formData.gender === option.value ? '#4facfe' : '#e1e5e9'}`,
                    borderRadius: '16px',
                    cursor: 'pointer',
                    background: formData.gender === option.value ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' : '#fafbfc',
                    color: formData.gender === option.value ? 'white' : 'inherit',
                    transform: formData.gender === option.value ? 'translateY(-2px)' : 'none',
                    boxShadow: formData.gender === option.value ? '0 8px 20px rgba(79, 172, 254, 0.3)' : 'none'
                  }}
                  onClick={() => handleInputChange('gender', option.value)}
                >
                  <span style={{ fontSize: '24px', marginBottom: '8px' }}>{option.emoji}</span>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{option.label}</span>
                </div>
              ))}
            </div>
            {errors.gender && <span style={{ color: '#ff4757', fontSize: '12px', marginTop: '5px', display: 'block' }}>{errors.gender}</span>}
          </div>

          {/* Email */}
          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="email" style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Email Address *</label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="your.email@example.com"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: `2px solid ${errors.email ? '#ff4757' : '#e1e5e9'}`,
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: errors.email ? '#fff5f5' : '#fafbfc'
              }}
            />
            {errors.email && <span style={{ color: '#ff4757', fontSize: '12px', marginTop: '5px', display: 'block' }}>{errors.email}</span>}
          </div>

          {/* Mobile Number */}
          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="mobile" style={{
              display: 'block',
              marginBottom: '8px',
              color: '#555',
              fontWeight: '600',
              fontSize: '14px'
            }}>Mobile Number *</label>
            <input
              type="tel"
              id="mobile"
              value={formData.mobileNumber}
              onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
              placeholder="+91 98765 43210"
              style={{
                width: '100%',
                padding: '16px 20px',
                border: `2px solid ${errors.mobileNumber ? '#ff4757' : '#e1e5e9'}`,
                borderRadius: '12px',
                fontSize: '16px',
                boxSizing: 'border-box',
                background: errors.mobileNumber ? '#fff5f5' : '#fafbfc'
              }}
            />
            {errors.mobileNumber && <span style={{ color: '#ff4757', fontSize: '12px', marginTop: '5px', display: 'block' }}>{errors.mobileNumber}</span>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            style={{
              width: '100%',
              padding: '18px',
              border: 'none',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '18px',
              boxShadow: '0 8px 20px rgba(102, 126, 234, 0.3)',
              marginTop: '20px'
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserInfo;
