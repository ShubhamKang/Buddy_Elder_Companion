// BuddyInfo.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadImageToStorage, uploadMultipleFiles, createFileMetadata } from '../utils/storageUtils';

const BuddyInfo = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    // Basic Information
    fullName: '',
    age: '',
    gender: '',
    profilePicture: null,
    mobileNumber: '',
    emailId: '',
    
    // Availability
    availableDays: [],
    timeSlots: [],
    helpType: 'instant', // instant or scheduled
    
    // Experience
    pastExperience: '',
    socialMediaProfile: '',
    certificates: [],
    hasExperience: false
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [previewImage, setPreviewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Pre-populate mobile number from login
  useEffect(() => {
    if (location.state?.mobileNumber) {
      setFormData(prev => ({
        ...prev,
        mobileNumber: location.state.mobileNumber
      }));
    }
  }, [location.state]);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeSlotOptions = [
    '6:00 AM - 9:00 AM', '9:00 AM - 12:00 PM', '12:00 PM - 3:00 PM',
    '3:00 PM - 6:00 PM', '6:00 PM - 9:00 PM', '9:00 PM - 12:00 AM'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFileUpload = (e, field) => {
    const file = e.target.files[0];
    if (field === 'profilePicture') {
      setFormData(prev => ({ ...prev, [field]: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => setPreviewImage(e.target.result);
      reader.readAsDataURL(file);
    } else if (field === 'certificates') {
      setFormData(prev => ({
        ...prev,
        certificates: [...prev.certificates, file]
      }));
    }
  };

  const handleDayToggle = (day) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  const handleTimeSlotToggle = (slot) => {
    setFormData(prev => ({
      ...prev,
      timeSlots: prev.timeSlots.includes(slot)
        ? prev.timeSlots.filter(s => s !== slot)
        : [...prev.timeSlots, slot]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setIsLoading(true);
      
      let profilePhotoURL = null;
      let profilePhotoData = null;
      
      // Upload profile photo using new storage utility
      if (formData.profilePicture) {
        try {
          const uploadResult = await uploadImageToStorage(
            formData.profilePicture, 
            'buddy-profiles', 
            formData.mobileNumber
          );
          profilePhotoURL = uploadResult.url;
          profilePhotoData = {
            name: uploadResult.originalName,
            fileName: uploadResult.fileName,
            size: uploadResult.size,
            type: uploadResult.type,
            url: uploadResult.url
          };
        } catch (storageError) {
          console.warn('Firebase Storage upload failed, storing file info instead:', storageError);
          // Fallback: Store file metadata instead of uploading
          profilePhotoData = createFileMetadata(formData.profilePicture);
        }
      }
      
      // Upload certificates using batch upload
      const certificateURLs = [];
      const certificateData = [];
      if (formData.certificates.length > 0) {
        try {
          const uploadResults = await uploadMultipleFiles(
            formData.certificates, 
            'buddy-certificates', 
            formData.mobileNumber
          );
          
          // Process successful uploads
          uploadResults.successful.forEach(result => {
            certificateURLs.push({
              name: result.originalName,
              fileName: result.fileName,
              url: result.url,
              size: result.size,
              type: result.type
            });
          });
          
          // Process failed uploads
          uploadResults.failed.forEach((failure, index) => {
            certificateData.push(createFileMetadata(formData.certificates[index]));
          });
          
        } catch (storageError) {
          console.warn('Certificate batch upload failed, storing file info instead:', storageError);
          // Fallback: Store all file metadata
          formData.certificates.forEach(cert => {
            certificateData.push(createFileMetadata(cert));
          });
        }
      }
      
      // Save all data to Firestore
      const buddyData = {
        // Basic Information
        fullName: formData.fullName,
        age: parseInt(formData.age),
        gender: formData.gender,
        profilePhotoURL: profilePhotoURL,
        profilePhotoData: profilePhotoData, // Fallback file info if upload fails
        mobileNumber: formData.mobileNumber,
        emailId: formData.emailId,
        
        // Availability
        availableDays: formData.availableDays,
        timeSlots: formData.timeSlots,
        helpType: formData.helpType,
        
        // Experience
        pastExperience: formData.pastExperience,
        socialMediaProfile: formData.socialMediaProfile,
        certificates: certificateURLs,
        certificateData: certificateData, // Fallback file info if upload fails
        hasExperience: formData.hasExperience,
        
        // Metadata
        registrationDate: serverTimestamp(),
        status: 'pending_approval',
        isActive: true,
        hasStorageIssues: profilePhotoData || certificateData.length > 0
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'buddies'), buddyData);
      
      console.log('Buddy registered successfully with ID:', docRef.id);
      
      // Show success message with appropriate warning if needed
      const hasUploadIssues = profilePhotoData || certificateData.length > 0;
      const successMessage = hasUploadIssues 
        ? '⚠️ Registration Complete with Notes!\n\nYour profile has been submitted for approval.\n\nNote: Some files could not be uploaded due to storage configuration. Your registration is still valid and will be processed.'
        : '🎉 Registration Complete! Welcome to BuddyBook!\n\nYour profile has been submitted for approval. You will be notified once approved.';
      
      alert(successMessage);
      
      // Navigate to home page after successful registration
      navigate('/home', { replace: true });
      
    } catch (error) {
      console.error('Error saving buddy data:', error);
      alert('❌ Registration failed. Please try again.\n\nError: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // All Styles in one object
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      maxWidth: '600px',
      width: '100%',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      padding: '30px',
      textAlign: 'center',
      color: 'white'
    },
    headerTitle: {
      margin: '0 0 10px 0',
      fontSize: '28px',
      fontWeight: '700'
    },
    headerSubtitle: {
      margin: '0 0 30px 0',
      opacity: '0.9',
      fontSize: '16px'
    },
    progressBar: {
      display: 'flex',
      justifyContent: 'center',
      gap: '20px',
      marginTop: '20px'
    },
    step: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      opacity: '0.5',
      transition: 'all 0.3s ease'
    },
    stepActive: {
      opacity: '1'
    },
    stepNumber: {
      width: '40px',
      height: '40px',
      borderRadius: '50%',
      background: 'rgba(255, 255, 255, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: '600',
      border: '2px solid rgba(255, 255, 255, 0.3)'
    },
    stepNumberActive: {
      background: 'white',
      color: '#4facfe',
      borderColor: 'white'
    },
    stepText: {
      fontSize: '12px',
      fontWeight: '500'
    },
    form: {
      padding: '40px'
    },
    formStep: {
      minHeight: '400px'
    },
    stepTitle: {
      margin: '0 0 30px 0',
      color: '#333',
      fontSize: '24px',
      fontWeight: '600'
    },
    formGroup: {
      marginBottom: '25px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      color: '#555',
      fontWeight: '500',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '15px',
      border: '2px solid #e1e5e9',
      borderRadius: '12px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box'
    },
    inputFocus: {
      outline: 'none',
      borderColor: '#4facfe',
      boxShadow: '0 0 0 3px rgba(79, 172, 254, 0.1)'
    },
    textarea: {
      width: '100%',
      padding: '15px',
      border: '2px solid #e1e5e9',
      borderRadius: '12px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
      resize: 'vertical',
      minHeight: '100px'
    },
    small: {
      display: 'block',
      marginTop: '5px',
      color: '#888',
      fontSize: '12px'
    },
    uploadArea: {
      position: 'relative',
      border: '2px dashed #ddd',
      borderRadius: '12px',
      padding: '20px',
      textAlign: 'center',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    uploadAreaHover: {
      borderColor: '#4facfe',
      background: 'rgba(79, 172, 254, 0.05)'
    },
    fileInput: {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      opacity: '0',
      cursor: 'pointer'
    },
    uploadPlaceholder: {
      padding: '20px'
    },
    uploadIcon: {
      fontSize: '48px',
      marginBottom: '10px'
    },
    uploadText: {
      margin: '10px 0 5px 0',
      fontWeight: '500',
      color: '#555'
    },
    imagePreview: {
      position: 'relative',
      display: 'inline-block'
    },
    previewImage: {
      width: '120px',
      height: '120px',
      borderRadius: '50%',
      objectFit: 'cover'
    },
    removeBtn: {
      position: 'absolute',
      top: '-5px',
      right: '-5px',
      background: '#ff4757',
      color: 'white',
      border: 'none',
      width: '25px',
      height: '25px',
      borderRadius: '50%',
      cursor: 'pointer',
      fontSize: '16px'
    },
    radioGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px'
    },
    radioOption: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '15px',
      border: '2px solid #e1e5e9',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    radioOptionHover: {
      borderColor: '#4facfe',
      background: 'rgba(79, 172, 254, 0.05)'
    },
    radioInput: {
      margin: '0',
      width: 'auto'
    },
    radioText: {
      fontWeight: '500',
      color: '#333'
    },
    radioTextActive: {
      color: '#4facfe',
      fontWeight: '600'
    },
    radioSmall: {
      display: 'block',
      color: '#888',
      fontSize: '12px',
      marginTop: '2px'
    },
    daysGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(7, 1fr)',
      gap: '10px'
    },
    dayBtn: {
      padding: '12px 8px',
      border: '2px solid #e1e5e9',
      borderRadius: '8px',
      background: 'white',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.3s ease',
      fontSize: '14px'
    },
    dayBtnActive: {
      background: '#4facfe',
      borderColor: '#4facfe',
      color: 'white'
    },
    timeSlotsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '12px'
    },
    timeSlotOption: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '12px',
      border: '2px solid #e1e5e9',
      borderRadius: '8px',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    timeSlotOptionHover: {
      borderColor: '#4facfe',
      background: 'rgba(79, 172, 254, 0.05)'
    },
    checkboxLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    fileUploadArea: {
      position: 'relative',
      border: '2px dashed #ddd',
      borderRadius: '12px',
      padding: '30px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    uploadTextDiv: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    },
    uploadEmoji: {
      fontSize: '36px',
      marginBottom: '10px'
    },
    uploadedFiles: {
      marginTop: '15px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '8px'
    },
    fileTag: {
      background: '#f8f9fa',
      padding: '6px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      color: '#555',
      border: '1px solid #e1e5e9'
    },
    navigation: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '40px',
      paddingTop: '20px',
      borderTop: '1px solid #e1e5e9'
    },
    btnSecondary: {
      padding: '12px 24px',
      border: '2px solid #e1e5e9',
      borderRadius: '12px',
      background: 'white',
      color: '#555',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    btnPrimary: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      color: 'white',
      cursor: 'pointer',
      fontWeight: '500',
      transition: 'all 0.3s ease'
    },
    btnSubmit: {
      padding: '15px 30px',
      border: 'none',
      borderRadius: '12px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '16px',
      transition: 'all 0.3s ease'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.headerTitle}>Become a Buddy</h2>
          <p style={styles.headerSubtitle}>Help others and make a difference in your community</p>
          
          {/* Progress Bar */}
          <div style={styles.progressBar}>
            <div style={{...styles.step, ...(currentStep >= 1 ? styles.stepActive : {})}}>
              <div style={{...styles.stepNumber, ...(currentStep >= 1 ? styles.stepNumberActive : {})}}>1</div>
              <span style={styles.stepText}>Basic Info</span>
            </div>
            <div style={{...styles.step, ...(currentStep >= 2 ? styles.stepActive : {})}}>
              <div style={{...styles.stepNumber, ...(currentStep >= 2 ? styles.stepNumberActive : {})}}>2</div>
              <span style={styles.stepText}>Availability</span>
            </div>
            <div style={{...styles.step, ...(currentStep >= 3 ? styles.stepActive : {})}}>
              <div style={{...styles.stepNumber, ...(currentStep >= 3 ? styles.stepNumberActive : {})}}>3</div>
              <span style={styles.stepText}>Experience</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Step 1: Basic Information */}
          {currentStep === 1 && (
            <div style={{...styles.formStep}}>
              <h3 style={styles.stepTitle}>Basic Personal Information</h3>
              
              {/* Profile Picture Upload */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Profile Picture *</label>
                <div style={styles.uploadArea}>
                  {previewImage ? (
                    <div style={styles.imagePreview}>
                      <img src={previewImage} alt="Profile Preview" style={styles.previewImage} />
                      <button 
                        type="button" 
                        style={styles.removeBtn}
                        onClick={() => {setPreviewImage(null); setFormData(prev => ({...prev, profilePicture: null}));}}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div style={styles.uploadPlaceholder}>
                      <div style={styles.uploadIcon}>📷</div>
                      <p style={styles.uploadText}>Upload your photo</p>
                      <small style={styles.small}>Build trust with a clear profile picture</small>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'profilePicture')}
                    required
                    style={styles.fileInput}
                  />
                </div>
              </div>

              {/* Full Name */}
              <div style={styles.formGroup}>
                <label htmlFor="fullName" style={styles.label}>Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  required
                  style={styles.input}
                />
              </div>

              {/* Age */}
              <div style={styles.formGroup}>
                <label htmlFor="age" style={styles.label}>Age *</label>
                <input
                  type="number"
                  id="age"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  placeholder="Enter your age"
                  min="18"
                  max="65"
                  required
                  style={styles.input}
                />
                <small style={styles.small}>Must be between 18-65 years</small>
              </div>

              {/* Gender */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Gender *</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={formData.gender === 'male'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      style={styles.radioInput}
                      required
                    />
                    <div>
                      <span style={formData.gender === 'male' ? styles.radioTextActive : styles.radioText}>👨 Male</span>
                    </div>
                  </label>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={formData.gender === 'female'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      style={styles.radioInput}
                      required
                    />
                    <div>
                      <span style={formData.gender === 'female' ? styles.radioTextActive : styles.radioText}>👩 Female</span>
                    </div>
                  </label>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="gender"
                      value="other"
                      checked={formData.gender === 'other'}
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      style={styles.radioInput}
                      required
                    />
                    <div>
                      <span style={formData.gender === 'other' ? styles.radioTextActive : styles.radioText}>🧑 Other</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Mobile Number */}
              <div style={styles.formGroup}>
                <label htmlFor="mobile" style={styles.label}>Mobile Number *</label>
                <div style={{display: 'flex', alignItems: 'center'}}>
                  <span style={{...styles.input, width: 'auto', marginRight: '10px', background: '#f8f9fa', color: '#666'}}>+91</span>
                  <input
                    type="tel"
                    id="mobile"
                    value={formData.mobileNumber}
                    onChange={(e) => handleInputChange('mobileNumber', e.target.value.replace(/\D/g, ''))}
                    placeholder="9876543210"
                    maxLength="10"
                    required
                    style={{...styles.input, flex: 1}}
                    readOnly={location.state?.fromLogin}
                  />
                </div>
                <small style={styles.small}>
                  {location.state?.fromLogin ? 
                    '✅ Verified mobile number from login' : 
                    'For contact and verification'
                  }
                </small>
              </div>

              {/* Email ID */}
              <div style={styles.formGroup}>
                <label htmlFor="email" style={styles.label}>Email ID (Optional)</label>
                <input
                  type="email"
                  id="email"
                  value={formData.emailId}
                  onChange={(e) => handleInputChange('emailId', e.target.value)}
                  placeholder="your.email@example.com"
                  style={styles.input}
                />
              </div>
            </div>
          )}

          {/* Step 2: Availability */}
          {currentStep === 2 && (
            <div style={styles.formStep}>
              <h3 style={styles.stepTitle}>Your Availability</h3>
              
              {/* Help Type */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Help Type *</label>
                <div style={styles.radioGroup}>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="helpType"
                      value="instant"
                      checked={formData.helpType === 'instant'}
                      onChange={(e) => handleInputChange('helpType', e.target.value)}
                      style={styles.radioInput}
                    />
                    <div>
                      <span style={formData.helpType === 'instant' ? styles.radioTextActive : styles.radioText}>Instant Help</span>
                      <small style={styles.radioSmall}>Available for immediate assistance</small>
                    </div>
                  </label>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="helpType"
                      value="scheduled"
                      checked={formData.helpType === 'scheduled'}
                      onChange={(e) => handleInputChange('helpType', e.target.value)}
                      style={styles.radioInput}
                    />
                    <div>
                      <span style={formData.helpType === 'scheduled' ? styles.radioTextActive : styles.radioText}>Scheduled Help</span>
                      <small style={styles.radioSmall}>Available for pre-planned assistance</small>
                    </div>
                  </label>
                  <label style={styles.radioOption}>
                    <input
                      type="radio"
                      name="helpType"
                      value="both"
                      checked={formData.helpType === 'both'}
                      onChange={(e) => handleInputChange('helpType', e.target.value)}
                      style={styles.radioInput}
                    />
                    <div>
                      <span style={formData.helpType === 'both' ? styles.radioTextActive : styles.radioText}>Both</span>
                      <small style={styles.radioSmall}>Flexible for any type of help</small>
                    </div>
                  </label>
                </div>
              </div>

              {/* Available Days */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Available Days *</label>
                <div style={styles.daysGrid}>
                  {daysOfWeek.map(day => (
                    <button
                      key={day}
                      type="button"
                      style={{
                        ...styles.dayBtn,
                        ...(formData.availableDays.includes(day) ? styles.dayBtnActive : {})
                      }}
                      onClick={() => handleDayToggle(day)}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slots */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Preferred Time Slots *</label>
                <div style={styles.timeSlotsGrid}>
                  {timeSlotOptions.map(slot => (
                    <label key={slot} style={styles.timeSlotOption}>
                      <input
                        type="checkbox"
                        checked={formData.timeSlots.includes(slot)}
                        onChange={() => handleTimeSlotToggle(slot)}
                        style={styles.radioInput}
                      />
                      <span style={formData.timeSlots.includes(slot) ? styles.radioTextActive : styles.radioText}>{slot}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Experience */}
          {currentStep === 3 && (
            <div style={styles.formStep}>
              <h3 style={styles.stepTitle}>Your Experience (Optional)</h3>
              
              {/* Experience Toggle */}
              <div style={styles.formGroup}>
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.hasExperience}
                    onChange={(e) => handleInputChange('hasExperience', e.target.checked)}
                    style={styles.radioInput}
                  />
                  I have experience helping others
                </label>
              </div>

              {/* Past Experience */}
              {formData.hasExperience && (
                <div style={styles.formGroup}>
                  <label htmlFor="experience" style={styles.label}>Describe Your Experience</label>
                  <textarea
                    id="experience"
                    value={formData.pastExperience}
                    onChange={(e) => handleInputChange('pastExperience', e.target.value)}
                    placeholder="Tell us about your experience helping others, any skills you have, etc."
                    rows="4"
                    style={styles.textarea}
                  />
                </div>
              )}

              {/* Social Media Profile */}
              <div style={styles.formGroup}>
                <label htmlFor="socialMedia" style={styles.label}>LinkedIn Profile (Optional)</label>
                <input
                  type="url"
                  id="socialMedia"
                  value={formData.socialMediaProfile}
                  onChange={(e) => handleInputChange('socialMediaProfile', e.target.value)}
                  placeholder="https://linkedin.com/in/yourprofile"
                  style={styles.input}
                />
                <small style={styles.small}>For identity verification and trust building</small>
              </div>

              {/* Certificate Upload */}
              <div style={styles.formGroup}>
                <label style={styles.label}>Certificates (Optional)</label>
                <div style={styles.fileUploadArea}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileUpload(e, 'certificates')}
                    style={styles.fileInput}
                  />
                  <div style={styles.uploadTextDiv}>
                    <span style={styles.uploadEmoji}>📄</span>
                    <p style={styles.uploadText}>Upload certificates or skill proofs</p>
                    <small style={styles.small}>PDF, JPG, PNG files only</small>
                  </div>
                </div>
                {formData.certificates.length > 0 && (
                  <div style={styles.uploadedFiles}>
                    {formData.certificates.map((file, index) => (
                      <span key={index} style={styles.fileTag}>
                        📎 {file.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div style={styles.navigation}>
            {currentStep > 1 && (
              <button type="button" onClick={prevStep} style={styles.btnSecondary}>
                ← Previous
              </button>
            )}
            
            <div style={{flex: 1}}></div>
            
            {currentStep < 3 ? (
              <button type="button" onClick={nextStep} style={styles.btnPrimary}>
                Next →
              </button>
            ) : (
              <button 
                type="submit" 
                style={{
                  ...styles.btnSubmit,
                  opacity: isLoading ? 0.7 : 1,
                  cursor: isLoading ? 'not-allowed' : 'pointer'
                }}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    🔄 Saving to Firebase...
                  </>
                ) : (
                  '🎉 Complete Registration'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BuddyInfo;
