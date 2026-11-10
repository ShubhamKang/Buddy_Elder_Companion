import React, { useState, useEffect } from 'react';
import { addressesApi } from '../api/profiles';
import { useAuth } from '../auth/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Map from './mapcomp';
import AddressForm from './adressformpage';

// Map a backend address (REST shape) to the shape this UI expects.
const mapAddress = (a) => ({
  ...a,
  id: a.id,
  label: a.label,
  address: a.line1 || a.address || '',
  name: a.name,
  phone: a.phone,
  landmark: a.landmark,
  lat: a.latitude ?? a.lat ?? 0,
  lng: a.longitude ?? a.lng ?? 0,
  primary: a.primary,
});

console.log('Environment:', process.env.NODE_ENV);

const AddressesWrapper = () => {
  try {
    return <Addresses />;
  } catch (error) {
    console.error('Error in Addresses component:', error);
    
    // More detailed error in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error stack:', error.stack);
      console.error('Error details:', error);
    }
    
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Error Loading Addresses</h2>
        <p>Something went wrong. Please refresh the page.</p>
        {process.env.NODE_ENV === 'development' && (
          <details style={{ marginTop: '10px', textAlign: 'left' }}>
            <summary>Error Details (Development)</summary>
            <pre style={{ background: '#f5f5f5', padding: '10px', fontSize: '12px' }}>
              {error.toString()}
            </pre>
          </details>
        )}
        <button onClick={() => window.location.reload()}>Refresh Page</button>
      </div>
    );
  }
};

const Addresses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Debug logging
  console.log('Addresses component rendered, user:', user);
  
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showMapSelector, setShowMapSelector] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const userLoading = !user;
  
  // Check if in select mode
  const isSelectMode = new URLSearchParams(location.search).get('mode') === 'select';
  const isLocationSelectMode = new URLSearchParams(location.search).get('mode') === 'location';
  const returnPage = new URLSearchParams(location.search).get('return');

  useEffect(() => {
    // Always call hooks unconditionally; guard inside
    if (user) {
      loadAddresses();
    }
  }, [user]);

  // Load addresses from the REST API
  const loadAddresses = async () => {
    if (!user) {
      console.log('No user in loadAddresses');
      return;
    }

    try {
      console.log('Loading addresses for user:', user.id);
      setLoading(true);
      const page = await addressesApi.list({ size: 100 });
      const addressData = (page?.content || []).map(mapAddress);
      console.log('Loaded addresses:', addressData);
      setAddresses(addressData);
    } catch (error) {
      console.error("Error loading addresses:", error);
      setAddresses([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  // Handle address selection in select mode
  const handleSelectAddress = async (address) => {
    if (!isSelectMode && !isLocationSelectMode) return;
    
    console.log('🎯 Address selection started:', address);
    console.log('🎯 returnPage parameter:', returnPage);
    
    try {
      // TODO: backend endpoint for "last used" timestamp; backend sets timestamps.
      console.log('✅ Address selection processed');
      
      // For location mode, save to userLocation
      if (isLocationSelectMode) {
        const locationData = {
          address: address.address,
          name: address.label,
          lat: address.lat,
          lng: address.lng,
          type: 'saved'
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));
      } else {
        // Store selected address for doctor booking or other use
        const selectedAddressData = {
          id: address.id,
          name: address.name || address.phone || 'Selected Address',
          address: address.address,
          phone: address.phone,
          label: address.label,
          lat: address.lat,
          lng: address.lng
        };
        localStorage.setItem('selectedAddress', JSON.stringify(selectedAddressData));
        
        // Trigger custom event to notify other components
        window.dispatchEvent(new CustomEvent('addressSelected', {
          detail: selectedAddressData
        }));
      }
      
      // Handle navigation with delay to ensure localStorage persistence
      const handleNavigation = () => {
        console.log('🚀 Executing navigation after delay...');
        if (returnPage) {
          navigate(-1); // Go back to previous page
        } else {
          navigate('/home');
        }
      };

      // Delay navigation to ensure localStorage and events are properly processed
      setTimeout(handleNavigation, 300);
      
    } catch (error) {
      console.error('Error updating address:', error);
      // Still proceed with selection
      if (isLocationSelectMode) {
        const locationData = {
          address: address.address,
          name: address.label,
          lat: address.lat,
          lng: address.lng,
          type: 'saved'
        };
        localStorage.setItem('userLocation', JSON.stringify(locationData));
      } else {
        const selectedAddressData = {
          id: address.id,
          name: address.name || address.phone || 'Selected Address',
          address: address.address,
          phone: address.phone,
          label: address.label,
          lat: address.lat,
          lng: address.lng
        };
        localStorage.setItem('selectedAddress', JSON.stringify(selectedAddressData));
        
        // Trigger custom event to notify other components
        window.dispatchEvent(new CustomEvent('addressSelected', {
          detail: selectedAddressData
        }));
      }
      
      // Handle navigation with delay in error case too
      const handleErrorNavigation = () => {
        console.log('🚀 Executing error navigation after delay...');
        if (returnPage) {
          navigate(-1); // Go back to previous page
        } else {
          navigate('/home');
        }
      };

      setTimeout(handleErrorNavigation, 300);
    }
  };

  // Delete address
  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    
    try {
      await addressesApi.remove(id);
      await loadAddresses();
    } catch (error) {
      console.error('Error deleting address:', error);
      alert('Error deleting address. Please try again.');
    }
  };

  // Edit address
  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setSelectedLocation({
      address: address.address,
      lat: address.lat,
      lng: address.lng
    });
    setShowAddressForm(true);
  };

  // Handle map location selection
  const handleMapLocationSelect = (locationData) => {
    setSelectedLocation(locationData);
    setShowMapSelector(false);
    if (isLocationSelectMode) {
      // Save to localStorage for header to pick up
      const loc = {
        address: locationData.address,
        name: locationData.name || 'Current Location',
        lat: locationData.lat,
        lng: locationData.lng,
        type: 'current'
      };
      try {
        localStorage.setItem('userLocation', JSON.stringify(loc));
        window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: loc }));
      } catch (e) {}
      navigate('/home');
    } else {
      setShowAddressForm(true);
    }
  };

  // Handle form save success
  const handleFormSaveSuccess = (savedAddress) => {
    loadAddresses();
    setShowAddressForm(false);
    setEditingAddress(null);
    setSelectedLocation(null);
    
    // If in select mode and new address, auto-select it
    if ((isSelectMode || isLocationSelectMode) && !editingAddress) {
      setTimeout(() => {
        handleSelectAddress(savedAddress);
      }, 500);
    } else {
      // Normal add/edit flow → show a toast and stay on page
      try {
        alert('Address saved successfully');
      } catch (_) {}
    }
  };

  // Go back
  const handleGoBack = () => {
    if (isSelectMode || isLocationSelectMode) {
      navigate('/home');
    } else {
      navigate(-1);
    }
  };

  const styles = {
    container: {
      maxWidth: '100%',
      margin: '0 auto',
      background: 'white',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    },
    header: {
      background: '#2c5aa0',
      color: 'white',
      padding: '15px 20px',
      display: 'flex',
      alignItems: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 1000,
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
    },
    backBtn: {
      background: 'none',
      border: 'none',
      color: 'white',
      fontSize: '20px',
      marginRight: '15px',
      cursor: 'pointer'
    },
    headerTitle: {
      fontSize: '18px',
      fontWeight: 500,
      margin: 0
    },
    addressBook: {
      padding: '20px',
      backgroundColor: '#f5f5f5',
      flex: 1,
      overflowY: 'auto',
      marginTop: '60px'
    },
    addNewAddress: {
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '15px 20px',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },
    addIcon: {
      color: '#2c5aa0',
      fontSize: '20px',
      marginRight: '15px'
    },
    addText: {
      color: '#2c5aa0',
      fontSize: '16px',
      fontWeight: 500
    },
    arrowRight: {
      marginLeft: 'auto',
      color: '#666'
    },
    sectionTitle: {
      color: '#999',
      fontSize: '14px',
      marginBottom: '15px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    addressItem: {
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '15px',
      marginBottom: '15px',
      position: 'relative',
      cursor: (isSelectMode || isLocationSelectMode) ? 'pointer' : 'default',
      transition: 'all 0.3s ease'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
      color: '#666'
    },
    spinner: {
      width: '20px',
      height: '20px',
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #2c5aa0',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '10px'
    },
         emptyState: {
       textAlign: 'center',
       color: '#666',
       padding: '40px 20px'
     },
     addressHeader: {
       display: 'flex',
       alignItems: 'center',
       marginBottom: '10px'
     },
     addressIcon: {
       fontSize: '20px',
       marginRight: '15px',
       color: '#666'
     },
     addressTitle: {
       fontSize: '16px',
       fontWeight: 500,
       color: '#333'
     },
     addressLabel: {
       background: '#f0f0f0',
       color: '#666',
       padding: '4px 8px',
       borderRadius: '4px',
       fontSize: '12px',
       marginLeft: '10px'
     },
     addressText: {
       color: '#666',
       fontSize: '14px',
       lineHeight: 1.4,
       marginLeft: '35px'
     },
     addressActions: {
       display: (isSelectMode || isLocationSelectMode) ? 'none' : 'flex',
       gap: '15px',
       marginTop: '15px',
       marginLeft: '35px'
     },
     actionBtn: {
       background: 'none',
       border: 'none',
       color: '#2c5aa0',
       cursor: 'pointer',
       fontSize: '16px',
       padding: '5px',
       borderRadius: '4px',
       transition: 'background 0.3s ease'
     },
     deleteBtn: {
       background: 'none',
       border: 'none',
       color: '#dc3545',
       cursor: 'pointer',
       fontSize: '16px',
       padding: '5px',
       borderRadius: '4px',
       transition: 'background 0.3s ease'
     },
     modal: {
       display: showLocationModal ? 'flex' : 'none',
       position: 'fixed',
       top: 0,
       left: 0,
       width: '100%',
       height: '100%',
       background: 'rgba(0,0,0,0.5)',
       zIndex: 2000,
       alignItems: 'center',
       justifyContent: 'center'
     },
     modalContent: {
       background: 'white',
       borderRadius: '12px',
       width: '90%',
       maxWidth: '500px',
       maxHeight: '80vh',
       overflow: 'hidden'
     },
     modalHeader: {
       padding: '20px',
       borderBottom: '1px solid #e0e0e0',
       display: 'flex',
       alignItems: 'center',
       justifyContent: 'space-between'
     },
     modalTitle: {
       fontSize: '18px',
       fontWeight: 600
     },
     closeBtn: {
       background: 'none',
       border: 'none',
       fontSize: '24px',
       cursor: 'pointer',
       color: '#666'
     },
     modalBody: {
       padding: '20px',
       maxHeight: '60vh',
       overflowY: 'auto'
     }
  };

  return (
    <>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={handleGoBack}>←</button>
          <h1 style={styles.headerTitle}>
            {(isSelectMode || isLocationSelectMode) ? 'SELECT ADDRESS' : 'ADDRESS BOOK'}
          </h1>
        </div>

        {/* Address Book */}
        <div style={styles.addressBook}>
          <div style={styles.addNewAddress} onClick={() => setShowLocationModal(true)}>
            <span style={styles.addIcon}>+</span>
            <span style={styles.addText}>
              {(isSelectMode || isLocationSelectMode) ? 'Select Location and Add Address' : 'Add New Address'}
            </span>
            <span style={styles.arrowRight}>›</span>
          </div>

          <div style={styles.sectionTitle}>
            {(isSelectMode || isLocationSelectMode) ? 'SELECT YOUR SAVED ADDRESS' : 'YOUR SAVED ADDRESS'}
          </div>

          {userLoading || loading ? (
            <div style={styles.loading}>
              <div style={styles.spinner}></div>
              Loading addresses...
            </div>
          ) : addresses.length === 0 ? (
            <div style={styles.emptyState}>
              {(isSelectMode || isLocationSelectMode) ? 'No saved addresses yet. Add a new address to continue.' : 'No saved addresses yet'}
            </div>
          ) : (
            addresses.map(address => {
              const displayName = address.name || address.phone || 'Address';
              const icon = address.label?.toLowerCase() === 'office' ? '🏢' : 
                          address.label?.toLowerCase() === 'home' ? '🏠' : '📍';
              
              const selectableStyle = (isSelectMode || isLocationSelectMode) ? {
                ...styles.addressItem,
                cursor: 'pointer',
                position: 'relative'
              } : styles.addressItem;

              return (
                <div 
                  key={address.id}
                  style={selectableStyle}
                  onClick={() => (isSelectMode || isLocationSelectMode) && handleSelectAddress(address)}
                >
                  {(isSelectMode || isLocationSelectMode) && (
                    <div style={{
                      position: 'absolute',
                      right: '15px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: '#2c5aa0',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}>→</div>
                  )}
                  <div style={styles.addressHeader}>
                    <span style={styles.addressIcon}>{icon}</span>
                    <span style={styles.addressTitle}>{displayName}</span>
                    <span style={styles.addressLabel}>{address.label || 'Address'}</span>
                  </div>
                  <div style={styles.addressText}>{address.address || 'No address provided'}</div>
                  <div style={styles.addressText}>📞 {address.phone || 'No phone'}</div>
                  
                  <div style={styles.addressActions}>
                    <button style={styles.actionBtn} onClick={() => handleEditAddress(address)}>
                      ✏️
                    </button>
                    <button 
                      style={styles.deleteBtn} 
                      onClick={() => handleDeleteAddress(address.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Location Selector Modal */}
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Select Location</h2>
              <button style={styles.closeBtn} onClick={() => setShowLocationModal(false)}>×</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.addNewAddress} onClick={() => {
                setShowLocationModal(false);
                setShowMapSelector(true);
              }}>
                <span style={styles.addIcon}>📍</span>
                <span style={styles.addText}>Add New Address</span>
                <span style={styles.arrowRight}>›</span>
              </div>

              <div style={styles.sectionTitle}>YOUR SAVED ADDRESS</div>
              {addresses.length === 0 ? (
                <div style={styles.emptyState}>
                  No saved addresses yet. Add a new address to continue.
                </div>
              ) : (
                addresses.map(address => {
                  const displayName = address.name || address.phone || 'Address';
                  const icon = address.label?.toLowerCase() === 'office' ? '🏢' : 
                              address.label?.toLowerCase() === 'home' ? '🏠' : '📍';
                  
                  return (
                    <div 
                      key={address.id}
                      style={{
                        ...styles.addressItem,
                        cursor: 'pointer',
                        position: 'relative'
                      }}
                      onClick={() => {
                        setShowLocationModal(false);
                        handleSelectAddress(address);
                      }}
                    >
                      <div style={{
                        position: 'absolute',
                        right: '15px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#2c5aa0',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}>→</div>
                      <div style={styles.addressHeader}>
                        <span style={styles.addressIcon}>{icon}</span>
                        <span style={styles.addressTitle}>{displayName}</span>
                        <span style={styles.addressLabel}>{address.label || 'Address'}</span>
                      </div>
                      <div style={styles.addressText}>{address.address || 'No address provided'}</div>
                      <div style={styles.addressText}>📞 {address.phone || 'No phone'}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Map Selector Component */}
      {showMapSelector && (
        <Map 
          onLocationSelect={handleMapLocationSelect}
          onClose={() => setShowMapSelector(false)}
        />
      )}

      {/* Address Form Component */}
      {showAddressForm && (
        <AddressForm 
          selectedLocation={selectedLocation}
          editingAddress={editingAddress}
          onSaveSuccess={handleFormSaveSuccess}
          onClose={() => {
            setShowAddressForm(false);
            setEditingAddress(null);
            setSelectedLocation(null);
          }}
          isSelectMode={isSelectMode || isLocationSelectMode}
        />
      )}
    </>
  );
};

export default AddressesWrapper; 