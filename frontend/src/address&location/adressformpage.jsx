import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, addDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const AddressForm = ({ selectedLocation, editingAddress, onSaveSuccess, onClose, isSelectMode }) => {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub && unsub();
  }, []);
  
  const [formData, setFormData] = useState({
    addressLabel: '',
    customLabel: '',
    contactName: '',
    phoneNumber: '',
    landmark: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    // Pre-fill form data
    if (editingAddress) {
      const isCustomLabel = !['Home', 'Office'].includes(editingAddress.label);
      setFormData({
        addressLabel: isCustomLabel ? 'Other' : editingAddress.label || '',
        customLabel: isCustomLabel ? editingAddress.label || '' : '',
        contactName: editingAddress.name || '',
        phoneNumber: editingAddress.phone || '',
        landmark: editingAddress.landmark || ''
      });
    } else {
      // Pre-fill with auth user data
      const current = auth.currentUser;
      setFormData({
        addressLabel: '',
        customLabel: '',
        contactName: current?.displayName || '',
        phoneNumber: (current?.phoneNumber || '').replace('+91', ''),
        landmark: ''
      });
    }
  }, [editingAddress]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear messages when user types
    if (message.text) {
      setMessage({ text: '', type: '' });
    }
  };

  const validateForm = () => {
    const { addressLabel, customLabel, contactName, phoneNumber, landmark } = formData;
    
    // Check address label (including custom label for Other)
    const finalAddressLabel = addressLabel === 'Other' ? customLabel : addressLabel;
    if (!finalAddressLabel || !finalAddressLabel.trim()) {
      setMessage({ text: 'Please select or enter address label', type: 'error' });
      return false;
    }
    
    if (!contactName.trim()) {
      setMessage({ text: 'Please enter contact name', type: 'error' });
      return false;
    }
    
    if (!phoneNumber.trim()) {
      setMessage({ text: 'Please enter phone number', type: 'error' });
      return false;
    }
    
    if (!landmark.trim()) {
      setMessage({ text: 'Please enter a nearby landmark', type: 'error' });
      return false;
    }
    
    return true;
  };

  const handleSaveAddress = async () => {
    if (!validateForm()) {
      return;
    }
    
    const activeUser = auth.currentUser || user;
    if (!activeUser) {
      setMessage({ text: 'Please sign in to save address', type: 'error' });
      return;
    }

    setLoading(true);
    
    const finalAddressLabel = formData.addressLabel === 'Other' ? formData.customLabel : formData.addressLabel;
    
    const addressData = {
      label: finalAddressLabel.trim(),
      name: formData.contactName.trim(),
      phone: formData.phoneNumber.trim(),
      address: selectedLocation?.address || 'Address not selected',
      landmark: formData.landmark.trim(),
      lat: selectedLocation?.lat || 0,
      lng: selectedLocation?.lng || 0,
      updatedAt: serverTimestamp()
    };

    try {
      const userAddressesRef = collection(db, 'users', activeUser.uid, 'addresses');
      let savedAddressId = null;
      
      if (editingAddress?.id) {
        // Update existing address
        const addressRef = doc(db, 'users', activeUser.uid, 'addresses', editingAddress.id);
        await updateDoc(addressRef, addressData);
        savedAddressId = editingAddress.id;
        setMessage({ text: 'Address updated successfully!', type: 'success' });
      } else {
        // Add new address
        addressData.createdAt = serverTimestamp();
        const docRef = await addDoc(userAddressesRef, addressData);
        savedAddressId = docRef.id;
        setMessage({ text: 'Address saved successfully!', type: 'success' });
      }
      
      // Create address object with ID for callback
      const savedAddressData = {
        ...addressData,
        id: savedAddressId
      };
      
      // Call success callback after a short delay
      setTimeout(() => {
        onSaveSuccess(savedAddressData);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving address:', error);
      setMessage({ text: 'Error saving address. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const { addressLabel, customLabel, contactName, phoneNumber, landmark } = formData;
    
    // Strict validation - ALL fields must be filled properly
    const finalAddressLabel = addressLabel === 'Other' ? customLabel : addressLabel;
    const addressLabelValid = finalAddressLabel && finalAddressLabel.trim().length > 0;
    const contactNameValid = contactName.trim().length > 0;
    const phoneNumberValid = phoneNumber.trim().length > 0;
    const landmarkValid = landmark.trim().length > 0;
    
    // All fields must be valid
    const isValid = addressLabelValid && 
                   contactNameValid && 
                   phoneNumberValid && 
                   landmarkValid;
    
    return isValid;
  };

  const styles = {
    addressForm: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      zIndex: 3000,
      display: 'block',
      overflowY: 'auto'
    },
    header: {
      background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3d6f 100%)',
      color: 'white',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      position: 'sticky',
      top: 0,
      zIndex: 1000,
      boxShadow: '0 4px 20px rgba(44,90,160,0.3)'
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '20px',
      marginRight: '15px',
      cursor: 'pointer'
    },
    formTitle: {
      fontSize: '18px',
      fontWeight: 500,
      margin: 0
    },
    formContainer: {
      padding: '20px 15px',
      maxWidth: '100%',
      width: '100%',
      margin: '0',
      background: 'white',
      borderRadius: '20px 20px 0 0',
      boxShadow: '0 -10px 30px rgba(0,0,0,0.1)',
      marginTop: '10px',
      minHeight: 'calc(100vh - 80px)',
      boxSizing: 'border-box'
    },
    formMessage: {
      marginBottom: '25px'
    },
    successMessage: {
      background: '#d4edda',
      color: '#155724',
      padding: '12px 15px',
      borderRadius: '8px',
      border: '1px solid #c3e6cb'
    },
    errorMessage: {
      background: '#f8d7da',
      color: '#721c24',
      padding: '12px 15px',
      borderRadius: '8px',
      border: '1px solid #f5c6cb'
    },
    formGroup: {
      marginBottom: '20px'
    },
    formLabel: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: 500,
      color: '#333',
      fontSize: '14px'
    },
    formInput: {
      width: '100%',
      maxWidth: '100%',
      padding: '14px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      fontSize: '16px',
      background: 'white',
      color: '#333',
      transition: 'all 0.3s ease',
      outline: 'none',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      boxSizing: 'border-box'
    },
    formTextarea: {
      width: '100%',
      maxWidth: '100%',
      padding: '14px 16px',
      border: '2px solid #e9ecef',
      borderRadius: '12px',
      fontSize: '16px',
      background: '#f8f9fa',
      transition: 'all 0.3s ease',
      outline: 'none',
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit',
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      boxSizing: 'border-box'
    },
    formActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '30px',
      position: 'sticky',
      bottom: 0,
      background: 'white',
      padding: '20px 0',
      borderTop: '1px solid #e0e0e0'
    },
    btn: {
      flex: 1,
      padding: '15px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '16px',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    btnPrimary: {
      background: '#2c5aa0',
      color: 'white'
    },
    btnSecondary: {
      background: '#f8f9fa',
      color: '#666',
      border: '1px solid #ddd'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid rgba(255,255,255,0.3)',
      borderTop: '2px solid white',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    },
    locationInfo: {
      background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
      border: '2px solid #2c5aa0',
      borderRadius: '16px',
      padding: '20px',
      marginBottom: '30px',
      boxShadow: '0 8px 25px rgba(44,90,160,0.15)'
    },
    locationInfoTitle: {
      margin: '0 0 10px 0',
      color: '#2c5aa0',
      fontSize: '16px',
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    locationInfoText: {
      margin: 0,
      color: '#495057',
      fontSize: '15px',
      lineHeight: 1.5,
      fontWeight: 500
    }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 480px) {
          .form-container {
            padding: 15px 10px !important;
          }
          
          .form-input {
            padding: 12px 14px !important;
            font-size: 16px !important;
          }
          
          .form-actions {
            flex-direction: row !important;
            gap: 10px !important;
          }
          
          .form-btn {
            flex: 1 !important;
            margin: 0 !important;
          }
        }
        
        @media (max-width: 360px) {
          .form-container {
            padding: 10px 8px !important;
          }
          
          .form-input {
            padding: 10px 12px !important;
          }
        }
      `}</style>

      <div style={styles.addressForm}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={onClose}>←</button>
          <h1 style={styles.formTitle}>
            {editingAddress ? 'EDIT ADDRESS' : 'ADD NEW ADDRESS'}
          </h1>
        </div>

        <div style={styles.formContainer} className="form-container">
          {/* Form Message */}
          {message.text && (
            <div style={styles.formMessage}>
              <div style={message.type === 'success' ? styles.successMessage : styles.errorMessage}>
                {message.text}
              </div>
            </div>
          )}

          {/* Selected Location Info */}
          {selectedLocation && (
            <div style={styles.locationInfo}>
              <h4 style={styles.locationInfoTitle}>📍 Selected Location</h4>
              <p style={styles.locationInfoText}>{selectedLocation.address}</p>
            </div>
          )}


          
          {/* Address Label */}
          <div style={styles.formGroup}>
            <label style={{...styles.formLabel}}>Address Label <span style={{color: '#dc3545'}}>*</span></label>
            
            {/* Address Type Selector */}
            <div style={{
              display: 'flex',
              gap: '10px',
              marginBottom: '10px',
              flexWrap: 'wrap'
            }}>
              {[
                { label: 'Home', icon: '🏠', value: 'Home' },
                { label: 'Office', icon: '🏢', value: 'Office' },
                { label: 'Other', icon: '📍', value: 'Other' }
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  style={{
                    flex: '1',
                    minWidth: '90px',
                    padding: '12px 8px',
                    border: formData.addressLabel === option.value ? '2px solid #2c5aa0' : '2px solid #e9ecef',
                    borderRadius: '12px',
                    background: formData.addressLabel === option.value ? '#e3f2fd' : '#f8f9fa',
                    color: formData.addressLabel === option.value ? '#2c5aa0' : '#666',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.3s ease'
                  }}
                  onClick={() => handleInputChange('addressLabel', option.value)}
                  onMouseEnter={(e) => {
                    if (formData.addressLabel !== option.value) {
                      e.target.style.borderColor = '#2c5aa0';
                      e.target.style.background = '#f0f7ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (formData.addressLabel !== option.value) {
                      e.target.style.borderColor = '#e9ecef';
                      e.target.style.background = '#f8f9fa';
                    }
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
            
            {/* Custom Label Input */}
            {formData.addressLabel === 'Other' && (
              <input
                type="text"
                className="form-input"
                style={{
                  ...styles.formInput,
                  borderColor: '#2c5aa0',
                  background: 'white'
                }}
                value={formData.addressLabel === 'Other' ? formData.customLabel || '' : formData.addressLabel}
                onChange={(e) => handleInputChange('customLabel', e.target.value)}
                placeholder="Enter custom address label"
                maxLength={50}
              />
            )}
          </div>

          {/* Contact Name */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Contact Name <span style={{color: '#dc3545'}}>*</span></label>
            <input
              type="text"
              className="form-input"
              style={{
                ...styles.formInput,
                borderColor: formData.contactName ? '#2c5aa0' : '#e9ecef',
                background: formData.contactName ? 'white' : '#f8f9fa'
              }}
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              placeholder="Your name"
              maxLength={100}
              onFocus={(e) => {
                e.target.style.borderColor = '#2c5aa0';
                e.target.style.background = 'white';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(44,90,160,0.15)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = formData.contactName ? '#2c5aa0' : '#e9ecef';
                e.target.style.background = formData.contactName ? 'white' : '#f8f9fa';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 10px rgba(0,0,0,0.05)';
              }}
            />
          </div>

          {/* Phone Number */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Phone Number <span style={{color: '#dc3545'}}>*</span></label>
            <input
              type="tel"
              className="form-input"
              style={styles.formInput}
              value={formData.phoneNumber}
              onChange={(e) => {
                // Allow any input for phone number
                handleInputChange('phoneNumber', e.target.value);
              }}
              placeholder="Your phone number"
              onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>



          {/* Landmark */}
          <div style={styles.formGroup}>
            <label style={styles.formLabel}>Landmark <span style={{color: '#dc3545'}}>*</span></label>
            <input
              type="text"
              className="form-input"
              style={styles.formInput}
              value={formData.landmark}
              onChange={(e) => handleInputChange('landmark', e.target.value)}
              placeholder="Any nearby landmark"
              maxLength={200}
              onFocus={(e) => e.target.style.borderColor = '#2c5aa0'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>



          {/* Form Actions */}
          <div style={styles.formActions} className="form-actions">
            <button 
              className="form-btn"
              style={{
                ...styles.btn,
                ...styles.btnSecondary
              }}
              onClick={onClose}
              disabled={loading}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.background = '#e9ecef';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.target.style.background = '#f8f9fa';
              }}
            >
              Cancel
            </button>
            

            
            <button 
              className="form-btn"
              style={{
                ...styles.btn,
                ...styles.btnPrimary,
                background: (loading || !isFormValid()) ? '#e9ecef' : '#2c5aa0',
                color: (loading || !isFormValid()) ? '#6c757d' : 'white',
                cursor: (loading || !isFormValid()) ? 'not-allowed' : 'pointer',
                border: (loading || !isFormValid()) ? '2px solid #dee2e6' : 'none',
                opacity: (loading || !isFormValid()) ? 0.7 : 1
              }}
              onClick={handleSaveAddress}
              disabled={loading || !isFormValid()}
              onMouseEnter={(e) => {
                if (!loading && isFormValid()) {
                  e.target.style.background = '#1e3d6f';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && isFormValid()) {
                  e.target.style.background = '#2c5aa0';
                }
              }}
              type="button"
            >
              {loading && <span style={styles.spinner}></span>}
              {loading ? 'Saving...' : (editingAddress ? 'Update Address' : 'Save Address')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddressForm;
