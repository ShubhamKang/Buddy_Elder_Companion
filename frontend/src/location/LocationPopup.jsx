import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import locationService from '../services/locationService';
import './LocationPopup.css';

const LocationPopup = ({ isOpen, onClose, onLocationSelect }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub && unsub();
  }, []);
  
  // States
  const [loading, setLoading] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [permissionState, setPermissionState] = useState('checking'); // checking, prompt, granted, denied, settings
  const [locationError, setLocationError] = useState(null);
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [showAllAddresses, setShowAllAddresses] = useState(false);
  
  // Permission state messages
  const permissionMessages = {
    checking: {
      icon: '⏳',
      title: 'Checking Location Access...',
      subtitle: 'Please wait while we check your location settings',
      primaryButton: null,
      showManual: false
    },
    prompt: {
      icon: '📍',
      title: 'Select Your Location',
      subtitle: 'Choose from saved addresses, detect current location, or add a new address',
      primaryButton: {
        text: 'Use Current Location',
        action: handleGetLocation
      },
      showManual: true
    },
    granted: {
      icon: '✅',
      title: 'Detecting your location...',
      subtitle: 'Please wait while we find your current location',
      primaryButton: null,
      showManual: false
    },
    denied: {
      icon: '🚫',
      title: 'Location Permission Denied',
      subtitle: 'You can enable location from your device settings or enter your address manually',
      primaryButton: {
        text: '⚙️ Open Settings',
        action: handleOpenSettings
      },
      showManual: true
    },
    settings: {
      icon: '⚙️',
      title: 'Enable Location in Settings',
      subtitle: 'Go to Settings > Apps > DhipyCare > Permissions > Location and enable it',
      primaryButton: {
        text: '🔄 I\'ve Enabled It',
        action: handleRetryAfterSettings
      },
      showManual: true
    },
    error: {
      icon: '❌',
      title: 'Unable to get location',
      subtitle: locationError || 'Please check your internet connection and try again',
      primaryButton: {
        text: '🔄 Retry',
        action: handleRequestPermission
      },
      showManual: true
    }
  };

  // Initialize without auto-detection
  useEffect(() => {
    if (isOpen) {
      // Don't auto-check permissions, just show manual options
      setPermissionState('prompt');
      if (user) {
        fetchSavedAddresses();
      }
    }
  }, [isOpen, user]);

  async function checkInitialPermissions() {
    setPermissionState('checking');
    
    try {
      const status = await locationService.checkPermissionStatus();
      console.log('Initial permission status:', status);
      
      if (status === 'granted') {
        // Automatically get location if permission already granted
        handleGetLocation();
      } else if (status === 'denied') {
        // Show prompt state to allow user to grant permission
        setPermissionState('prompt');
      } else {
        setPermissionState('prompt');
      }
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionState('prompt');
    }
  }

  async function fetchSavedAddresses() {
    try {
      const addressesRef = collection(db, 'users', user.uid, 'addresses');
      const snapshot = await getDocs(addressesRef);
      const addresses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedAddresses(addresses);
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }
  }

  async function handleRequestPermission() {
    setLoading(true);
    setLocationError(null);
    
    try {
      const result = await locationService.requestPermission();
      console.log('Permission request result:', result);
      
      if (result.status === 'granted') {
        handleGetLocation();
      } else if (result.status === 'denied') {
        // Permission denied - show retry button to request again
        setLoading(false);
        setLocationError('Location permission was denied. Please allow location access.');
        // Keep state as 'prompt' to show the button again
        setPermissionState('prompt');
        // Or show error state with retry button
        setPermissionState('error');
      }
    } catch (error) {
      console.error('Permission request error:', error);
      setLocationError('Failed to request permission');
      setPermissionState('error');
      setLoading(false);
    }
  }

  async function handleGetLocation() {
    setPermissionState('granted');
    setLoading(true);
    setLocationError(null);
    
    // Set a timeout to prevent infinite spinning
    const locationTimeout = setTimeout(() => {
      console.error('Location detection timeout');
      setLocationError('Location detection is taking too long. Please try again.');
      setPermissionState('error');
      setLoading(false);
    }, 30000); // 30 second timeout
    
    try {
      // Check if location services are enabled
      const isEnabled = await locationService.isLocationEnabled();
      if (!isEnabled) {
        clearTimeout(locationTimeout);
        throw new Error('Location services are disabled');
      }
      
      // Get current location with enhanced accuracy
      const location = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
      
      clearTimeout(locationTimeout);
      console.log('Got location:', location);
      
      // If permission denied after getting location (rare case)
      if (!location) {
        throw new Error('Location not available');
      }
      
      // Get address from coordinates
      const address = await locationService.getAddressFromCoords(
        location.latitude,
        location.longitude
      );
      
      const locationData = {
        lat: location.latitude,
        lng: location.longitude,
        address: address?.formatted || `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
        name: address?.formatted || address?.components?.area || address?.components?.city || 'Current Location',
        area: address?.components?.area || '',
        city: address?.components?.city || '',
        type: 'current'
      };
      
      // Persist immediately so header updates without delay
      try {
        localStorage.setItem('userLocation', JSON.stringify(locationData));
      } catch (_) {}
      window.dispatchEvent(new CustomEvent('locationUpdated', { detail: locationData }));
      window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: locationData }));
      setDetectedLocation(locationData);
      
      // Close shortly after showing the detected card
      setTimeout(() => {
        onLocationSelect(locationData);
        onClose();
      }, 600);
      
    } catch (error) {
      clearTimeout(locationTimeout);
      console.error('Location error:', error);
      
      if (error.code === 'PERMISSION_DENIED') {
        setLocationError('Location permission denied. Please allow location access and try again.');
        setPermissionState('error');
      } else if (error.code === 'POSITION_UNAVAILABLE') {
        setLocationError('Location services are turned off on your device');
        setPermissionState('error');
      } else if (error.code === 'TIMEOUT') {
        setLocationError('Location request timed out. Please try again');
        setPermissionState('error');
      } else {
        setLocationError(error.message || 'Unable to get your location');
        setPermissionState('error');
      }
      
      setLoading(false);
    }
  }

  async function handleOpenSettings() {
    const opened = await locationService.openAppSettings();
    if (opened) {
      setPermissionState('settings');
    } else {
      // Fallback for web or if settings can't be opened
      alert('Please go to Settings > Apps > DhipyCare > Permissions > Location and enable location access');
    }
  }

  async function handleRetryAfterSettings() {
    await checkInitialPermissions();
  }

  function handleManualEntry() {
    // Import and use Map component directly
    navigate('/select-location');
    onClose();
  }

  function handleSelectAddress(address) {
    const locationData = {
      address: address.address,
      name: address.label,
      lat: address.lat,
      lng: address.lng,
      area: address.area || '',
      city: address.city || '',
      type: 'saved'
    };
    
    localStorage.setItem('userLocation', JSON.stringify(locationData));
    
    // Dispatch custom event to notify header about location update
    window.dispatchEvent(new CustomEvent('locationUpdated', {
      detail: locationData
    }));
    
    console.log('📍 Saved address selected and event dispatched:', locationData);
    
    onLocationSelect(locationData);
    onClose();
  }

  if (!isOpen) return null;

  const currentMessage = permissionMessages[permissionState] || permissionMessages.prompt;
  const visibleAddresses = showAllAddresses ? savedAddresses : savedAddresses.slice(0, 2);

  return (
    <>
      <div className="location-popup-overlay" onClick={onClose}>
        <div className="location-popup" onClick={(e) => e.stopPropagation()}>
          {/* Close button */}
          <button className="location-popup-close" onClick={onClose}>
            ✕
          </button>

          {/* Main content */}
          <div className="location-popup-content">
            {/* Icon */}
            <div className="location-popup-icon">
              {currentMessage.icon}
            </div>

            {/* Title and subtitle */}
            <h2 className="location-popup-title">{currentMessage.title}</h2>
            <p className="location-popup-subtitle">{currentMessage.subtitle}</p>

            {/* Detected location display */}
            {detectedLocation && (
              <div className="detected-location">
                <div className="detected-location-icon">📍</div>
                <div className="detected-location-details">
                  <div className="detected-location-area">{detectedLocation.area || 'Current Location'}</div>
                  <div className="detected-location-address">{detectedLocation.address}</div>
                </div>
                <div className="detected-location-loader"></div>
              </div>
            )}

            {/* Primary action button */}
            {currentMessage.primaryButton && (
              <button
                className="location-popup-primary-btn"
                onClick={currentMessage.primaryButton.action}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="button-loader"></span>
                    Detecting location...
                  </>
                ) : (
                  currentMessage.primaryButton.text
                )}
              </button>
            )}

            {/* Manual entry option */}
            {currentMessage.showManual && (
              <>
                <div className="location-popup-divider">
                  <span>OR</span>
                </div>
                
                <button
                  className="location-popup-manual-btn"
                  onClick={handleManualEntry}
                >
                  <span className="manual-icon">🔍</span>
                  <span>Search your location manually</span>
                  <span className="arrow">→</span>
                </button>
              </>
            )}

            {/* Saved addresses */}
            {savedAddresses.length > 0 && currentMessage.showManual && (
              <div className="saved-addresses-section">
                <h3 className="saved-addresses-title">SAVED ADDRESSES</h3>
                
                {visibleAddresses.map((address) => (
                  <button
                    key={address.id}
                    className="saved-address-item"
                    onClick={() => handleSelectAddress(address)}
                  >
                    <div className="address-icon">
                      {address.type === 'home' ? '🏠' : address.type === 'work' ? '💼' : '📍'}
                    </div>
                    <div className="address-details">
                      <div className="address-label">{address.label}</div>
                      <div className="address-text">{address.address}</div>
                    </div>
                    <span className="arrow">→</span>
                  </button>
                ))}
                
                {savedAddresses.length > 2 && (
                  <button
                    className="view-more-btn"
                    onClick={() => setShowAllAddresses(!showAllAddresses)}
                  >
                    {showAllAddresses ? 'View Less' : `View ${savedAddresses.length - 2} More`}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Bottom helper text */}
          <div className="location-popup-footer">
            <p>🔒 Your location data is secure and only used for service delivery</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LocationPopup; 