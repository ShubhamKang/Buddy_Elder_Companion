import React, { useState, useEffect, useCallback, useRef } from 'react';
import locationService from '../services/locationService';
// Lightweight web shims to avoid external/native deps in web build
// Provided via frontend/.env.local (gitignored); see .env.example.
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || '';
const loadGoogleMapsAPI = async () => {
  if (window.google && window.google.maps) return;
  if (!GOOGLE_MAPS_API_KEY) {
    throw new Error('REACT_APP_GOOGLE_MAPS_API_KEY is not set');
  }
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
  script.async = true;
  await new Promise((res, rej) => { script.onload = res; script.onerror = rej; document.head.appendChild(script); });
};
const defaultMapOptions = { zoom: 14, gestureHandling: 'greedy' };
const createCleanMarkerIcon = () => undefined;
const Capacitor = { isNativePlatform: () => false, getPlatform: () => 'web' };
const Geolocation = { getCurrentPosition: (opts) => new Promise((res, rej)=> navigator.geolocation.getCurrentPosition(res, rej, opts)), checkPermissions: async()=>({location:'granted'}) };
const App = { openSettings: async()=>{} };
const Device = { getInfo: async()=>({ platform:'web' }) };

const Map = ({ onLocationSelect, onClose }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [currentPosition, setCurrentPosition] = useState({
    lat: 26.8467,
    lng: 80.9462
  });
  const [mapLoading, setMapLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [useRealMap, setUseRealMap] = useState(false);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [showHighAccuracyDialog, setShowHighAccuracyDialog] = useState(false);
  const [isCapacitorApp, setIsCapacitorApp] = useState(false);
  const [locationAttempts, setLocationAttempts] = useState(0);
  const [enableHighAccuracy, setEnableHighAccuracy] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  
  // Simple toast notification
  const [toast, setToast] = useState({
    show: false,
    message: '',
    type: 'success'
  });

  // AUTOCOMPLETE STATE
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [searchInputRef, setSearchInputRef] = useState(null);

  // *** FIX: Add useEffect for component cleanup ***
  useEffect(() => {
    // This is the cleanup function that runs when the component unmounts
    return () => {
      console.log('Unmounting Map component and cleaning up resources...');

      // 1. Clean up Google Map instance to free memory
      if (mapInstanceRef.current) {
        console.log('Cleaning up Google Map instance.');
        // Setting to null helps garbage collection
        mapInstanceRef.current = null;
      }

      // 2. Clean up the map marker
      if (markerRef.current) {
        console.log('Cleaning up map marker.');
        markerRef.current.setMap(null); // Remove marker from map
        markerRef.current = null;
      }

      // 3. Clean up any other potential listeners or timeouts
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
      
      // Note: App listeners like 'appStateChange' should also be removed here
      // if they were added. The current implementation adds them inside another function,
      // so we need to ensure they are tracked and removed properly.
      // For now, focusing on the map instance is the highest priority.
    };
  }, []); // Empty dependency array means this runs only on mount and unmount


  // Simple toast function
  const showToast = (message, type = 'success') => {
    console.log('🔔 Toast:', message, type);
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // REPILL/SWIGGY STYLE: Automatic permission handling (No manual requestPermissions)
  const useCurrentLocation = async () => {
    if (locationLoading) return;
    
    console.log('📍 Starting automatic location request (Repill style)...');
    
    // Clear any existing toasts
    setToast({ show: false, message: '', type: 'success' });
    
    // Reset flags and try location - let getCurrentPosition handle permissions automatically
    console.log('📋 Letting getCurrentPosition handle permissions automatically...');
    setIsPermanentlyDenied(false);
    requestCapacitorLocation();
  };

  // GOOGLE HIGH ACCURACY FLOW: Always request high accuracy to trigger Google dialog
  const requestCapacitorLocation = async () => {
    try {
      setLocationLoading(true);
      console.log('📱 Requesting location with high accuracy to trigger Google dialog...');
      
      // Always use high accuracy to trigger Google's "Turn on location accuracy?" dialog
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true, // Always true to trigger Google dialog
        timeout: 20000,
        maximumAge: 30000
      });
      
      console.log('✅ Location obtained with high accuracy:', position);
      await processLocationSuccess(position);
      
    } catch (error) {
      console.error('❌ Location error:', error);
      const errorMessage = error.message || '';
      
      // Check if it's a permission error
      if (errorMessage.includes('permission') || 
          errorMessage.includes('denied') || 
          errorMessage.includes('User denied') ||
          error.code === 1) {
        
        console.log('🚫 Permission denied - checking if permanent...');
        
        // Try to check permission status to detect "Don't ask again"
        try {
          const permissionStatus = await Geolocation.checkPermissions();
          if (permissionStatus.location === 'denied') {
            // "Don't ask again" detected - show Hindi settings dialog
            console.log('🚫 "Don\'t ask again" detected - showing Hindi settings dialog');
            setIsPermanentlyDenied(true);
            setShowLocationDialog(true);
            showToast('Location permanently blocked. कृपया settings में जाकर enable करें।', 'info');
          } else {
            // Normal denial - can retry next time
            console.log('⚠️ Normal permission denial - can retry');
            setShowLocationDialog(true);
            showToast('Location access denied. कृपया permission allow करें।', 'info');
          }
        } catch (checkError) {
          // Error checking permission - assume permanent denial
          console.log('🚫 Permission check failed - assuming permanent denial');
          setIsPermanentlyDenied(true);
          setShowLocationDialog(true);
          showToast('Location access denied. कृपया settings में enable करें।', 'info');
        }
        
      } else {
        // Location accuracy issue or Google dialog "No thanks" clicked
        console.log('📍 Location accuracy issue - showing custom high accuracy dialog');
        setShowHighAccuracyDialog(true);
        showToast('Location accuracy required. कृपया high accuracy enable करें।', 'info');
      }
    }
    
    setLocationLoading(false);
  };

  // Browser location request (fallback)
  const requestBrowserLocation = () => {
    if (!navigator.geolocation) {
      showToast('Location not supported on this device', 'error');
      return;
    }
    
    setLocationLoading(true);
    console.log('🌐 Requesting browser location...');
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          console.log('✅ Browser location obtained:', position);
          await processLocationSuccess(position);
        } catch (error) {
          console.error('Address fetch error:', error);
          showToast('Location detected but address could not be found', 'info');
        }
        setLocationLoading(false);
      },
      (error) => {
        console.error('❌ Browser location error:', error);
        setLocationLoading(false);
        
        if (error.code === 1) { // PERMISSION_DENIED
          setShowLocationDialog(true);
        } else if (error.code === 2) { // POSITION_UNAVAILABLE
          showToast('📡 Location not available. Please check your location settings.', 'error');
        } else if (error.code === 3) { // TIMEOUT
          showToast('⏱️ Location request timed out. Please try again.', 'error');
        } else {
          showToast('❌ Unable to get location. Please try again or search manually.', 'error');
        }
      },
      {
        enableHighAccuracy: enableHighAccuracy,
        timeout: enableHighAccuracy ? 20000 : 15000,
        maximumAge: 60000
      }
    );
  };

  // Process successful location - shared function with enhanced address resolution
  const processLocationSuccess = async (position) => {
    const newPosition = { 
      lat: position.coords.latitude, 
      lng: position.coords.longitude 
    };
    setCurrentPosition(newPosition);

    console.log('🔍 Resolving address for coordinates:', newPosition);
    
    let resolvedAddress = null;
    let locationName = 'Current Location';

    // FIX 1: Try Google's Geocoding API first (most accurate)
    if (window.google?.maps?.Geocoder) {
      try {
        console.log('🌐 Using Google Geocoding API...');
        const geocoder = new window.google.maps.Geocoder();
        
        const googleAddress = await new Promise((resolve) => {
          geocoder.geocode({ location: newPosition }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const result = results[0];
              console.log('✅ Google geocoding success:', result.formatted_address);
              resolve({
                formatted: result.formatted_address,
                name: result.address_components[0]?.long_name || 'Current Location',
                components: {
                  area: result.address_components.find(c => c.types.includes('sublocality'))?.long_name || '',
                  city: result.address_components.find(c => c.types.includes('locality'))?.long_name || ''
                }
              });
            } else {
              console.log('⚠️ Google geocoding failed:', status);
              resolve(null);
            }
          });
        });

        if (googleAddress) {
          resolvedAddress = googleAddress.formatted;
          locationName = googleAddress.name;
        }
      } catch (error) {
        console.error('❌ Google geocoding error:', error);
      }
    }

    // FIX 2: Fallback to our location service (if Google failed)
    if (!resolvedAddress) {
      try {
        console.log('🔄 Fallback to location service...');
        const serviceAddress = await locationService.getAddressFromCoords(
          position.coords.latitude, 
          position.coords.longitude
        );
        
        if (serviceAddress?.formatted) {
          resolvedAddress = serviceAddress.formatted;
          console.log('✅ Location service success:', resolvedAddress);
        }
      } catch (error) {
        console.error('❌ Location service error:', error);
      }
    }

    // FIX 3: Final fallback to coordinates (NO wrong city names)
    if (!resolvedAddress) {
      resolvedAddress = `📍 ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      console.log('📍 Using coordinates as fallback:', resolvedAddress);
    }

    const locationData = {
      ...newPosition,
      address: resolvedAddress,
      name: locationName,
      accuracy: position.coords.accuracy
    };
    
    console.log('🎯 Final location data:', locationData);
    setSelectedLocation(locationData);

    // Update map if available
    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setPosition(newPosition);
      mapInstanceRef.current.panTo(newPosition);
      mapInstanceRef.current.setZoom(17);
    }

    const accuracyText = position.coords.accuracy ? ` (±${Math.round(position.coords.accuracy)}m)` : '';
    const highAccText = enableHighAccuracy ? ' [High Accuracy]' : '';
    showToast(`📍 Location detected${accuracyText}${highAccText}!`, 'success');
  };

  // REMOVED: Complex app state change handling - keeping it simple

  // REMOVED: Auto-detection on startup - keeping it simple

  // Initialize map and detect platform
  useEffect(() => {
    let isMounted = true;
    
    // Detect platform properly
    const isNativeApp = Capacitor.isNativePlatform();
    setIsCapacitorApp(isNativeApp);
    console.log('🔍 Platform detected:', isNativeApp ? 'Capacitor App' : 'Browser');
    
    sessionStorage.setItem('mapComponentActive', 'true');
    
    const initializeMap = async () => {
      if (!isMounted) return;
      
      try {
        console.log('🗺️ Initializing map...');
        
        // Check if Google Maps is already loaded
        if (window.google && window.google.maps) {
          console.log('✅ Google Maps already loaded');
          setupRealMap();
        } else {
          console.log('🔄 Loading Google Maps API...');
          await loadGoogleMapsAPI();
          if (isMounted && window.google && window.google.maps) {
            console.log('✅ Google Maps loaded successfully');
            setupRealMap();
          } else {
            throw new Error('Google Maps failed to load');
          }
        }
      } catch (error) {
        console.warn('⚠️ Map initialization failed:', error);
        if (isMounted) {
          setUseRealMap(false);
          setMapLoading(false);
        }
      }
    };
    
    const setupRealMap = () => {
      if (!isMounted || !mapRef.current) return;
      
      try {
        console.log('🔧 Setting up Google Maps...');
        
        const map = new window.google.maps.Map(mapRef.current, {
          ...defaultMapOptions,
          center: currentPosition,
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: window.google.maps.ControlPosition.RIGHT_BOTTOM
          }
        });
        
        mapInstanceRef.current = map;
        
        // Create custom clean marker
        const marker = new window.google.maps.Marker({
          position: currentPosition,
          map: map,
          draggable: true,
          title: 'Drag to select location',
          icon: createCleanMarkerIcon(),
          animation: window.google.maps.Animation.DROP
        });
        
        markerRef.current = marker;
        
        // Add event listeners
        marker.addListener('dragend', () => {
          if (!isMounted) return;
          const position = marker.getPosition();
          const newPos = {
            lat: position.lat(),
            lng: position.lng()
          };
          setCurrentPosition(newPos);
          updateAddressFromCoordinates(newPos);
        });
        
        map.addListener('click', (event) => {
          if (!isMounted) return;
          const newPos = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
          };
          marker.setPosition(newPos);
          setCurrentPosition(newPos);
          updateAddressFromCoordinates(newPos);
        });
        
        if (isMounted) {
          setUseRealMap(true);
          setMapLoading(false);
          console.log('🎉 Google Maps ready!');
        }
        
      } catch (error) {
        console.error('❌ Map setup error:', error);
        if (isMounted) {
          setUseRealMap(false);
          setMapLoading(false);
        }
      }
    };
    
    initializeMap();
    
    return () => {
      isMounted = false;
      sessionStorage.removeItem('mapComponentActive');
      
      // Cleanup
      if (mapInstanceRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(mapInstanceRef.current);
        } catch (error) {
          console.log('Map cleanup error:', error);
        }
      }
      
      if (markerRef.current) {
        try {
          window.google.maps.event.clearInstanceListeners(markerRef.current);
          markerRef.current.setMap(null);
        } catch (error) {
          console.log('Marker cleanup error:', error);
        }
      }
      
      console.log('🧹 Cleanup completed');
    };
  }, []);

  const updateAddressFromCoordinates = async (position) => {
    console.log('🔍 Updating address for map interaction:', position);
    
    let resolvedAddress = null;
    let locationName = 'Selected Location';

    try {
      // PRIMARY: Use Google's Geocoding API (most accurate)
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        
        const googleResult = await new Promise((resolve) => {
          geocoder.geocode({ location: position }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const result = results[0];
              console.log('✅ Map interaction - Google geocoding success:', result.formatted_address);
              resolve({
                address: result.formatted_address,
                name: result.address_components[0]?.long_name || 'Selected Location'
              });
            } else {
              console.log('⚠️ Map interaction - Google geocoding failed:', status);
              resolve(null);
            }
          });
        });

        if (googleResult) {
          resolvedAddress = googleResult.address;
          locationName = googleResult.name;
        }
      }

      // FALLBACK: Use our location service
      if (!resolvedAddress) {
        try {
          console.log('🔄 Map interaction - Using location service fallback...');
          const serviceAddress = await locationService.getAddressFromCoords(position.lat, position.lng);
          if (serviceAddress?.formatted) {
            resolvedAddress = serviceAddress.formatted;
            console.log('✅ Map interaction - Location service success:', resolvedAddress);
          }
        } catch (serviceError) {
          console.error('❌ Map interaction - Location service error:', serviceError);
        }
      }

      // FINAL FALLBACK: Coordinates (NO wrong city names)
      if (!resolvedAddress) {
        resolvedAddress = `📍 ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`;
        console.log('📍 Map interaction - Using coordinates fallback:', resolvedAddress);
      }

      const locationData = {
        address: resolvedAddress,
        lat: position.lat,
        lng: position.lng,
        name: locationName
      };
      
      console.log('🎯 Map interaction - Final location:', locationData);
      setSelectedLocation(locationData);

    } catch (error) {
      console.error('❌ Map interaction - Address update error:', error);
      // Emergency fallback
      setSelectedLocation({
        address: `📍 ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
        lat: position.lat,
        lng: position.lng,
        name: 'Selected Location'
      });
    }
  };

  const handleSearch = async (searchText) => {
    if (!searchText.trim() || !useRealMap) return;
    
    try {
      if (window.google.maps.places && window.google.maps.places.AutocompleteService) {
        const autocompleteService = new window.google.maps.places.AutocompleteService();
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        const request = {
          input: searchText,
          componentRestrictions: { country: 'IN' },
          types: ['establishment', 'geocode']
        };
        
        autocompleteService.getPlacePredictions(request, (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            const prediction = predictions[0];
            
            const detailRequest = {
              placeId: prediction.place_id,
              fields: ['name', 'geometry', 'formatted_address', 'place_id']
            };
            
            placesService.getDetails(detailRequest, (place, detailStatus) => {
              if (detailStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
                const position = {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                };
                
                setSelectedLocation({
                  address: place.formatted_address,
                  lat: position.lat,
                  lng: position.lng,
                  name: place.name || 'Selected Location'
                });
                
                setCurrentPosition(position);
                
                if (mapInstanceRef.current && markerRef.current) {
                  mapInstanceRef.current.panTo(position);
                  mapInstanceRef.current.setZoom(16);
                  markerRef.current.setPosition(position);
                }
                
                showToast(`Location found: ${place.formatted_address}`, 'success');
              }
            });
          } else {
            showToast('No locations found. Try a different search term.', 'error');
          }
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      showToast('Search failed. Please try again.', 'error');
    }
    
    setSearchValue('');
  };

  const handleConfirmLocation = () => {
    console.log('🔘 Confirm button clicked, selectedLocation:', selectedLocation);
    
    if (selectedLocation) {
      console.log('✅ Location confirmed, calling onLocationSelect with:', selectedLocation);
      onLocationSelect(selectedLocation);
    } else {
      console.log('❌ No location selected');
      showToast('Please select a location first', 'info');
    }
  };

  // Enhanced Native Settings Opening (Using OpenAppSettings Plugin + Fallbacks)
  const openDeviceSettings = async () => {
    try {
      if (isCapacitorApp && Capacitor.isNativePlatform()) {
        // Close any open dialogs first
        setShowLocationDialog(false);
        setShowHighAccuracyDialog(false);
        
        console.log('🔧 Opening native settings with enhanced methods...');
        
        let settingsOpened = false;
        
        // Get device info for better targeting
        const deviceInfo = await Device.getInfo();
        console.log('📱 Device Info:', deviceInfo);
        
        // Method 1: openappsettings plugin - Most reliable
        try {
          console.log('🔸 Trying openappsettings plugin...');
          if (window.cordova && window.cordova.plugins.settings) {
            window.cordova.plugins.settings.open("application_details", 
              () => {
                console.log('✅ Settings opened via cordova-open-native-settings plugin');
                settingsOpened = true;
              },
              () => {
                console.error('❌ Failed to open settings via cordova plugin');
              }
            );
          } else {
            console.log('cordova-open-native-settings plugin not available.');
          }
        } catch (openSettingsError) {
          console.log('⚠️ openappsettings failed, trying fallback methods:', openSettingsError.message);
          
          // Method 2: Native App.openSettings() fallback
          try {
            console.log('🔸 Trying native App.openSettings()...');
            await App.openSettings();
            settingsOpened = true;
            console.log('✅ Native settings opened successfully');
            showToast('🔧 Go to Permissions → Location → Allow', 'info');
          } catch (appError) {
            console.log('⚠️ Native App.openSettings() failed:', appError.message);
          }
        }
        
        if (settingsOpened) {
          // Start monitoring for permission changes
          console.log('🔄 Settings opened, starting auto-detection...');
          startPermissionMonitoring();
          
          // Enhanced feedback message
          setTimeout(() => {
            showToast('💡 We\'ll automatically detect when you enable location and return to the app!', 'info');
          }, 2000);
        } else {
          // Enhanced fallback with specific device instructions
          console.log('⚠️ All native methods failed, showing device-specific manual instructions');
          showEnhancedManualInstructions(deviceInfo);
        }
      }
    } catch (error) {
      console.error('❌ Enhanced settings opening error:', error);
      showEnhancedManualInstructions();
    }
  };

  // Enhanced manual instructions based on device
  const showEnhancedManualInstructions = async (deviceInfo = null) => {
    try {
      if (!deviceInfo) {
        deviceInfo = await Device.getInfo();
      }
      
      let instructions = '';
      let icon = '📱';
      
      if (deviceInfo.platform === 'android') {
        icon = '🤖';
        if (deviceInfo.manufacturer?.toLowerCase().includes('samsung')) {
          instructions = 'Samsung: Settings → Apps → DhipyCare → Permissions → Location → Allow';
        } else if (deviceInfo.manufacturer?.toLowerCase().includes('xiaomi')) {
          instructions = 'Xiaomi: Settings → Apps → Manage apps → DhipyCare → Permissions → Location';
        } else if (deviceInfo.manufacturer?.toLowerCase().includes('huawei')) {
          instructions = 'Huawei: Settings → Apps → DhipyCare → Permissions → Location → Allow';
        } else {
          instructions = 'Android: Settings → Apps → DhipyCare → Permissions → Location → Allow';
        }
      } else if (deviceInfo.platform === 'ios') {
        icon = '🍎';
        instructions = 'iOS: Settings → Privacy & Security → Location Services → DhipyCare → While Using App';
      } else {
        instructions = 'Please enable location permission for DhipyCare in your device settings';
      }
      
      console.log('📖 Enhanced instructions for', deviceInfo.manufacturer, deviceInfo.model, ':', instructions);
      showToast(`${icon} ${instructions}`, 'info');
      
      // Show dialog after instructions
      setTimeout(() => {
        setShowLocationDialog(true);
      }, 2000);
      
      // Still start monitoring
      startPermissionMonitoring();
      
    } catch (error) {
      console.error('Error showing enhanced instructions:', error);
      showToast('Please enable location permission for DhipyCare in device settings', 'info');
      startPermissionMonitoring();
    }
  };

  // Show manual settings instructions as fallback
  const showManualSettingsInstructions = () => {
    const platform = Capacitor.getPlatform();
    let instructions = '';
    
    if (platform === 'android') {
      instructions = 'Manual: Settings → Apps → DhipyCare → Permissions → Location → Allow';
    } else if (platform === 'ios') {
      instructions = 'Manual: Settings → Privacy → Location → DhipyCare → While Using App';
    } else {
      instructions = 'Please enable location permission for DhipyCare in device settings';
    }
    
    console.log('📖 Manual instructions:', instructions);
    showToast(instructions, 'info');
    
    // Show dialog with detailed steps
    setTimeout(() => {
      setShowLocationDialog(true);
    }, 2000);
    
    // Still start monitoring in case user manually goes to settings
    startPermissionMonitoring();
  };

  // Start monitoring for permission changes (auto detection) - Enhanced
  const startPermissionMonitoring = () => {
    console.log('🔄 Starting permission monitoring...');
    
    const checkInterval = setInterval(async () => {
      try {
        if (!isCapacitorApp) {
          console.log('🛑 Not a Capacitor app, stopping monitoring');
          clearInterval(checkInterval);
          return;
        }
        
        const permission = await Geolocation.checkPermissions();
        console.log('🔍 Monitoring check - permission:', permission.location);
        
        if (permission.location === 'granted') {
          console.log('✅ Location permission auto-detected as granted!');
          
          // Reset all denial flags
          setIsPermanentlyDenied(false);
          setLocationAttempts(0);
          
          // Clear monitoring
          clearInterval(checkInterval);
          
          // Close any open dialogs
          setShowLocationDialog(false);
          setShowHighAccuracyDialog(false);
          
          // Auto-trigger location detection
          showToast('🎉 Location enabled! Getting your location...', 'success');
          setTimeout(() => {
            requestCapacitorLocation();
          }, 1000);
        }
      } catch (error) {
        console.error('❌ Error in permission monitoring:', error);
        clearInterval(checkInterval);
      }
    }, 3000); // Check every 3 seconds

    // Stop monitoring after 3 minutes to prevent battery drain
    setTimeout(() => {
      clearInterval(checkInterval);
      console.log('🛑 Stopped permission monitoring after 3 minutes');
    }, 180000);
  };

  // Persistent Location Dialog Handlers
  const handleLocationDialogRetry = () => {
    setShowLocationDialog(false);
    
    if (isCapacitorApp && isPermanentlyDenied) {
      // If permanently denied in Capacitor, open settings instead of retry
      openDeviceSettings();
    } else {
      // SIMPLIFIED RETRY: Direct location request instead of useCurrentLocation
      console.log('🔄 Retrying location request - direct call to requestCapacitorLocation');
      setIsPermanentlyDenied(false); // Reset flag for retry
      requestCapacitorLocation(); // Direct call to avoid infinite loops
    }
  };

  const handleLocationDialogSettings = () => {
    setShowLocationDialog(false);
    if (isCapacitorApp) {
      openDeviceSettings();
    } else {
      showToast('Please allow location access in browser settings and refresh the page.', 'info');
    }
  };

  const handleLocationDialogSkip = () => {
    setShowLocationDialog(false);
    showToast('Please search for your location manually using the search bar.', 'info');
  };

  // High Accuracy Dialog Handlers - Google Dialog Retry Flow
  const handleHighAccuracyEnable = () => {
    setShowHighAccuracyDialog(false);
    console.log('🎯 User enabled high accuracy - retrying Google accuracy dialog');
    // Retry location request - this will trigger Google's "Turn on location accuracy?" again
    requestCapacitorLocation();
  };

  const handleHighAccuracySkip = () => {
    setShowHighAccuracyDialog(false);
    console.log('⏭️ User skipped high accuracy - will retry next time');
    showToast('Location accuracy skipped. आप बाद में भी enable कर सकते हैं।', 'info');
  };

  // Persistent Location Permission Dialog (Swiggy/Zepto style)
  const PersistentLocationDialog = () => {
    if (!showLocationDialog) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📍</div>
          
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#1f2937'
          }}>
            {isCapacitorApp && isPermanentlyDenied 
              ? 'Enable Location Services' 
              : 'Location Access Required'
            }
          </h3>
          
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.5',
            marginBottom: '24px'
          }}>
            {isCapacitorApp && isPermanentlyDenied
              ? (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    कैसे location allow करें:
                  </div>
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '12px', 
                    borderRadius: '8px', 
                    fontSize: '14px',
                    textAlign: 'left',
                    border: '1px solid #e5e7eb'
                  }}>
                    <strong>📱 Android:</strong><br/>
                    Settings → Apps → DhipyCare → Permissions → Location → Allow
                    <br/><br/>
                    <strong>🍎 iOS:</strong><br/>
                    Settings → Privacy → Location Services → DhipyCare → While Using App
                  </div>
                </div>
              )
              : isCapacitorApp 
              ? 'हमें आपके पास के healthcare services खोजने और accurate delivery के लिए location access चाहिए।'
              : 'Please allow location access in your browser to automatically detect your current location for better service.'
            }
          </p>

          <div style={{ marginBottom: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#f3f4f6',
              borderRadius: '8px',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🏥</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Find nearby doctors & services
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#f3f4f6',
              borderRadius: '8px'
            }}>
              <span style={{ fontSize: '20px' }}>🚚</span>
              <span style={{ fontSize: '14px', color: '#374151' }}>
                Accurate delivery tracking
              </span>
            </div>
          </div>

          {/* Repill-style button layout */}
          {isCapacitorApp && isPermanentlyDenied ? (
            // Repill style: CANCEL and SETTINGS in row, then Grant Permission below
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleLocationDialogSkip}
                  style={{
                    background: 'transparent',
                    color: '#6b7280',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  CANCEL
                </button>
                
                <button
                  onClick={openDeviceSettings}
                  style={{
                    background: 'transparent',
                    color: '#2c5aa0',
                    border: 'none',
                    padding: '12px 20px',
                    fontSize: '16px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    textTransform: 'uppercase'
                  }}
                >
                  SETTINGS
                </button>
              </div>
              
              <div style={{ textAlign: 'center', margin: '8px 0' }}>
                <span style={{ fontSize: '14px', color: '#9ca3af', fontWeight: '500' }}>OR</span>
              </div>
              
              <button
                onClick={handleLocationDialogRetry}
                style={{
                  background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3d6f 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                Grant Permission
              </button>
            </div>
          ) : (
            // Normal dialog layout for first-time requests
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <button
                onClick={handleLocationDialogRetry}
                style={{
                  background: 'linear-gradient(135deg, #2c5aa0 0%, #1e3d6f 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Allow Location Access
              </button>
              
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleLocationDialogSettings}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Settings
                </button>
                
                <button
                  onClick={handleLocationDialogSkip}
                  style={{
                    background: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Search Manually
                </button>
              </div>
            </div>
          )}
          
          <div style={{
            fontSize: '12px',
            color: '#9ca3af',
            marginTop: '16px',
            lineHeight: '1.4'
          }}>
            {isCapacitorApp && isPermanentlyDenied 
              ? 'Permission Denied • Open Settings Required'
              : `Attempt ${locationAttempts} • ${isCapacitorApp ? 'Native App' : 'Browser'}`
            }
          </div>
        </div>
      </div>
    );
  };

  // High Accuracy Dialog
  const HighAccuracyDialog = () => {
    if (!showHighAccuracyDialog) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '380px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
          
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#1f2937'
          }}>
            High Accuracy Required
          </h3>
          
          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            lineHeight: '1.5',
            marginBottom: '24px'
          }}>
            <div style={{ marginBottom: '12px' }}>
              बेहतर location accuracy के लिए Google का "Turn on location accuracy" dialog फिर से दिखाएं?
            </div>
            <div style={{ fontSize: '14px', color: '#9ca3af' }}>
              This will show Google's location accuracy dialog again for precise location detection.
            </div>
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <button
              onClick={handleHighAccuracyEnable}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              🎯 Show Google Accuracy Dialog
            </button>
            
            <button
              onClick={handleHighAccuracySkip}
              style={{
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Skip / बाद में करें
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Simple app resume handler - reset flags when permission granted after settings
  useEffect(() => {
    if (!isCapacitorApp) return;
    
    const handleAppStateChange = async (state) => {
      if (state.isActive && isPermanentlyDenied) {
        console.log('📱 App resumed - checking if location was enabled in settings');
        
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location === 'granted') {
            console.log('✅ Location now enabled - resetting flags');
            setIsPermanentlyDenied(false);
            setShowLocationDialog(false);
            showToast('🎉 Location enabled! आप अब current location use कर सकते हैं।', 'success');
          }
        } catch (error) {
          console.log('Error checking permission on app resume:', error);
        }
      }
    };
    
    // Web build: no-op
    return () => {};
  }, [isCapacitorApp, isPermanentlyDenied]);

  // DEBOUNCED SEARCH - triggers real-time autocomplete
  const handleInputChange = (value) => {
    console.log('🔍 handleInputChange called with:', value);
    setSearchValue(value);
    
    // Clear previous timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }
    
    // Hide autocomplete if value is empty
    if (!value.trim()) {
      setShowAutocomplete(false);
      setAutocompleteResults([]);
      return;
    }
    
    console.log('⏱️ Setting debounce timer for autocomplete search...');
    // Debounce search - wait 300ms after user stops typing
    autocompleteTimeoutRef.current = setTimeout(() => {
      console.log('🚀 Debounce complete, calling performAutocompleteSearch...');
      performAutocompleteSearch(value);
    }, 300);
  };

  const performAutocompleteSearch = async (searchText) => {
    // FIXED: Remove useRealMap dependency and improve API checking
    if (!searchText.trim() || searchText.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      setAutocompleteLoading(false);
      return;
    }

    try {
      setAutocompleteLoading(true);
      console.log('🔍 Performing autocomplete search for:', searchText);
      
      // ENHANCED: Better Google Places API availability check
      const isGooglePlacesAvailable = () => {
        return window.google && 
               window.google.maps && 
               window.google.maps.places && 
               window.google.maps.places.AutocompleteService;
      };

      // FIXED: Wait for Google Maps to load if not available
      if (!isGooglePlacesAvailable()) {
        console.log('⏳ Google Places API not ready, waiting...');
        
        // Try to load Google Maps API if not loaded
        if (!window.google || !window.google.maps) {
          try {
            await loadGoogleMapsAPI();
            console.log('✅ Google Maps API loaded for autocomplete');
          } catch (error) {
            console.error('❌ Failed to load Google Maps API:', error);
            setAutocompleteLoading(false);
            showToast('Search temporarily unavailable. Please try current location.', 'info');
            return;
          }
        }
        
        // Double check after loading attempt
        if (!isGooglePlacesAvailable()) {
          console.error('❌ Google Places API still not available');
          setAutocompleteLoading(false);
          setAutocompleteResults([]);
          setShowAutocomplete(false);
          showToast('Search service unavailable. Please use current location or try again later.', 'info');
          return;
        }
      }
      
      console.log('✅ Google Places API ready, performing search...');
      const autocompleteService = new window.google.maps.places.AutocompleteService();
      
      // FIX: Removed 'types' entirely for broader search results
      // This includes all location types: establishments, addresses, geocoded locations
      // No types restriction = more comprehensive autocomplete results
      const request = {
        input: searchText,
        componentRestrictions: { country: 'IN' }
      };
      
      autocompleteService.getPlacePredictions(request, (predictions, status) => {
        setAutocompleteLoading(false);
        console.log('🔍 Autocomplete response:', status, predictions?.length || 0, 'results');
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
          // Format predictions for display
          const formattedResults = predictions.slice(0, 6).map((prediction, index) => ({
            id: prediction.place_id,
            primaryText: prediction.structured_formatting?.main_text || prediction.description,
            secondaryText: prediction.structured_formatting?.secondary_text || '',
            fullText: prediction.description,
            placeId: prediction.place_id,
            index: index
          }));
          
          console.log('✅ Autocomplete results formatted:', formattedResults.length);
          console.log('📋 Setting autocomplete results:', formattedResults);
          setAutocompleteResults(formattedResults);
          setShowAutocomplete(true);
          console.log('👁️ Setting showAutocomplete to TRUE');
          setSelectedSuggestionIndex(-1);
        } else {
          console.log('⚠️ No autocomplete results or API error:', status);
          setAutocompleteResults([]);
          setShowAutocomplete(searchText.length >= 2); // Show "no results" message
        }
      });
      
    } catch (error) {
      console.error('❌ Autocomplete search error:', error);
      setAutocompleteLoading(false);
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      showToast('Search error. Please try again.', 'error');
    }
  };

  // HANDLE SUGGESTION SELECTION
  const handleSuggestionSelect = async (suggestion) => {
    console.log('🎯 Suggestion selected:', suggestion);
    if (!suggestion?.placeId) {
      console.error('❌ No placeId found in suggestion');
      return;
    }
    
    try {
      setAutocompleteLoading(true);
      setShowAutocomplete(false);
      setSearchValue(suggestion.primaryText);
      console.log('🔍 Getting place details for placeId:', suggestion.placeId);
      
      if (window.google?.maps?.places?.PlacesService) {
        const placesService = new window.google.maps.places.PlacesService(document.createElement('div'));
        
        const detailRequest = {
          placeId: suggestion.placeId,
          fields: ['name', 'geometry', 'formatted_address', 'place_id', 'types']
        };
        
        placesService.getDetails(detailRequest, (place, status) => {
          console.log('📍 Place details response:', status, place);
          setAutocompleteLoading(false);
          
          if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const position = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng()
            };
            
            console.log('✅ New position:', position);
            
            // Update location data
            const newLocation = {
              address: place.formatted_address,
              lat: position.lat,
              lng: position.lng,
              name: place.name || suggestion.primaryText,
              placeId: place.place_id
            };
            
            console.log('🎯 Setting new location:', newLocation);
            setSelectedLocation(newLocation);
            setCurrentPosition(position);
            
            // Update map
            if (mapInstanceRef.current && markerRef.current) {
              console.log('🗺️ Updating map position');
              mapInstanceRef.current.panTo(position);
              mapInstanceRef.current.setZoom(16);
              markerRef.current.setPosition(position);
            } else {
              console.warn('⚠️ Map not available for update');
            }
            
            showToast(`📍 Location selected: ${place.formatted_address}`, 'success');
            
            // Clear search after delay
            setTimeout(() => {
              setSearchValue('');
            }, 1500);
          } else {
            console.error('❌ Place details failed:', status);
            showToast('Unable to get location details. Please try again.', 'error');
          }
        });
      } else {
        console.error('❌ Places service not available');
        setAutocompleteLoading(false);
        showToast('Places service not available. Please try again.', 'error');
      }
    } catch (error) {
      console.error('❌ Suggestion selection error:', error);
      showToast('Error selecting location. Please try again.', 'error');
      setAutocompleteLoading(false);
    }
  };

  // KEYBOARD NAVIGATION for autocomplete
  const handleKeyDown = (e) => {
    if (!showAutocomplete || autocompleteResults.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < autocompleteResults.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : autocompleteResults.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && autocompleteResults[selectedSuggestionIndex]) {
          handleSuggestionSelect(autocompleteResults[selectedSuggestionIndex]);
        } else if (searchValue.trim()) {
          // Fallback to original search if no suggestion selected
          handleSearch(searchValue);
          setShowAutocomplete(false);
        }
        break;
        
      case 'Escape':
        setShowAutocomplete(false);
        setSelectedSuggestionIndex(-1);
        if (searchInputRef) {
          searchInputRef.blur();
        }
        break;
        
      default:
        break;
    }
  };

  // AUTOCOMPLETE DROPDOWN COMPONENT
  const AutocompleteDropdown = () => {
    console.log('🎨 AutocompleteDropdown render - showAutocomplete:', showAutocomplete, 'results:', autocompleteResults.length);
    if (!showAutocomplete) return null;

    return (
      <div 
        role="listbox"
        style={{
          position: 'absolute',
          top: '100%', // FIX: Right below the search input
          left: '0',
          right: '0',
          background: 'white',
          borderRadius: '0 0 8px 8px', // Rounded bottom corners only
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 2000,
          maxHeight: '300px',
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderTop: 'none' // No top border to connect with search input
        }}>
        {autocompleteLoading && (
          <div style={{
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid #e5e7eb',
              borderTop: '2px solid #2c5aa0',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Searching...
          </div>
        )}

        {!autocompleteLoading && autocompleteResults.length === 0 && searchValue.length >= 2 && (
          <div style={{
            padding: '16px',
            color: '#6b7280',
            fontSize: '14px',
            textAlign: 'center'
          }}>
            No locations found for "{searchValue}"
          </div>
        )}

        {!autocompleteLoading && autocompleteResults.map((suggestion, index) => (
          <div
            key={suggestion.placeId}
            role="option"
            onClick={() => handleSuggestionSelect(suggestion)}
            onMouseDown={(e) => {
              // FIX: Prevent blur event when clicking suggestions
              e.preventDefault();
              handleSuggestionSelect(suggestion);
            }}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              borderBottom: index < autocompleteResults.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: selectedSuggestionIndex === index ? '#f8fafc' : 'transparent',
              transition: 'background-color 0.2s ease',
              ':hover': {
                backgroundColor: '#f8fafc'
              }
            }}
            onMouseEnter={() => setSelectedSuggestionIndex(index)}
            onMouseLeave={() => setSelectedSuggestionIndex(-1)}
          >
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span style={{
                fontSize: '18px',
                color: '#6b7280',
                minWidth: '20px'
              }}>
                📍
              </span>
              
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '15px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '2px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {suggestion.primaryText}
                </div>
                
                {suggestion.secondaryText && (
                  <div style={{
                    fontSize: '13px',
                    color: '#6b7280',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {suggestion.secondaryText}
                  </div>
                )}
              </div>
              
              {selectedSuggestionIndex === index && (
                <span style={{
                  fontSize: '16px',
                  color: '#2c5aa0'
                }}>
                  →
                </span>
              )}
            </div>
          </div>
        ))}
        
        {!autocompleteLoading && autocompleteResults.length > 0 && (
          <div style={{
            padding: '8px 16px',
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center',
            borderTop: '1px solid #f3f4f6',
            background: '#f9fafb'
          }}>
            ↑↓ Navigate • Enter to select • Esc to close
          </div>
        )}
      </div>
    );
  };

  // Cleanup autocomplete timeout on unmount
  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current);
      }
    };
  }, []);

  return (
    <>
      {/* Persistent Location Dialog */}
      <PersistentLocationDialog />
      
      {/* High Accuracy Dialog */}
      <HighAccuracyDialog />

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '100px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999999,
          maxWidth: '350px',
          width: '90%',
          padding: '15px 20px',
          borderRadius: '12px',
          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '14px',
          fontWeight: '500',
          animation: 'fadeInUp 0.3s ease-out',
          background: toast.type === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' :
                     toast.type === 'error' ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                     'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white'
        }}>
          <span style={{ fontSize: '16px' }}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'white',
        zIndex: 3000,
        display: 'block'
      }}>
        {/* Header */}
        <div style={{
          background: '#2c5aa0',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <button 
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '20px',
              marginRight: '15px',
              cursor: 'pointer'
            }}
            onClick={onClose}
          >
            ←
          </button>
          <h1 style={{
            fontSize: '16px',
            fontWeight: 500,
            margin: 0
          }}>
            VERIFY AND SET MAP PIN LOCATION
          </h1>
          {!mapLoading && (
            <div style={{
              marginLeft: 'auto',
              fontSize: '12px',
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: useRealMap ? '#4CAF50' : '#FFC107'
              }}></div>
              {useRealMap ? 'Live Map' : 'Loading...'}
            </div>
          )}
        </div>
        
        {/* Search with Real-time Autocomplete */}
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '20px',
          right: '20px',
          zIndex: 1000
        }}>
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (searchValue.trim()) {
                handleSearch(searchValue);
                setShowAutocomplete(false);
              }
            }}
            style={{ position: 'relative' }}
          >
            <span style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#666',
              zIndex: 1001,
              fontSize: '18px'
            }}>
              {autocompleteLoading ? '⏳' : '🔍'}
            </span>
            
            <input 
              ref={(ref) => setSearchInputRef(ref)}
              type="text" 
              style={{
                width: '100%',
                maxWidth: '100%',
                padding: '12px 50px 12px 45px',
                border: showAutocomplete ? '2px solid #2c5aa0' : 'none',
                borderRadius: showAutocomplete ? '8px 8px 0 0' : '8px',
                fontSize: '16px',
                color: '#333',
                background: 'white',
                boxShadow: showAutocomplete 
                  ? '0 2px 10px rgba(44,90,160,0.15)' 
                  : '0 2px 10px rgba(0,0,0,0.1)',
                outline: 'none',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
              placeholder="Search for any location..."
              value={searchValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (searchValue.length >= 2 && autocompleteResults.length > 0) {
                  setShowAutocomplete(true);
                }
              }}
              onBlur={(e) => {
                // FIX: Longer delay to allow clicks on suggestions
                setTimeout(() => {
                  // Only hide if user is not interacting with dropdown
                  if (!document.activeElement || 
                      !document.activeElement.closest('[role="listbox"]')) {
                    setShowAutocomplete(false);
                  }
                }, 300);
              }}
              autoComplete="off"
            />
            
            {/* Clear button */}
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  setSearchValue('');
                  setShowAutocomplete(false);
                  setAutocompleteResults([]);
                  if (searchInputRef) {
                    searchInputRef.focus();
                  }
                }}
                style={{
                  position: 'absolute',
                  right: '15px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#9ca3af',
                  cursor: 'pointer',
                  fontSize: '18px',
                  padding: '4px',
                  borderRadius: '50%',
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.color = '#6b7280'}
                onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              >
                ✕
              </button>
            )}
          </form>
          
          {/* Autocomplete Dropdown */}
          <AutocompleteDropdown />
        </div>

        {/* Map Container */}
        <div style={{
          width: '100%',
          height: 'calc(100vh - 80px)',
          position: 'relative'
        }}>
          {/* Map div */}
          <div 
            ref={mapRef} 
            style={{
              width: '100%', 
              height: '100%',
              minHeight: '400px',
              position: 'absolute',
              top: 0,
              left: 0,
              display: useRealMap && !mapLoading ? 'block' : 'none'
            }} 
          />
          
          {/* Loading Overlay */}
          {mapLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '20px',
                padding: '40px 30px',
                boxShadow: '0 20px 60px rgba(0,0,0,0.1)'
              }}>
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>🗺️</div>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '3px solid transparent',
                  borderTop: '3px solid #2c5aa0',
                  borderRadius: '50%',
                  animation: 'spin 1.5s linear infinite',
                  margin: '20px auto'
                }}></div>
                <h3 style={{
                  color: '#2c5aa0',
                  fontSize: '24px',
                  fontWeight: 600,
                  margin: '20px 0 10px 0'
                }}>
                  Loading Interactive Map
                </h3>
                <p style={{ color: '#666', fontSize: '16px', margin: '0' }}>
                  Please wait...
                </p>
              </div>
            </div>
          )}
          
          {/* Offline Map Message */}
          {!mapLoading && !useRealMap && (
            <div style={{
              width: '100%',
              height: '100%',
              background: '#f8f9fa',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
              <h3 style={{ 
                color: '#495057', 
                fontSize: '24px', 
                fontWeight: 600, 
                margin: '0 0 15px 0' 
              }}>
                Map Loading Failed
              </h3>
              <p style={{ 
                color: '#6c757d', 
                fontSize: '16px', 
                margin: '0 0 30px 0' 
              }}>
                Please check your internet connection and try again.
              </p>
              <button 
                onClick={() => window.location.reload()}
                style={{
                  background: '#2c5aa0',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '15px 25px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔄 Retry
              </button>
            </div>
          )}
        </div>

        {/* Bottom Info */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'white',
          padding: '20px',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)'
        }}>
          {/* Use Current Location Button */}
          <button 
            style={{
              background: locationLoading 
                ? '#ccc' 
                : enableHighAccuracy 
                ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
                : 'linear-gradient(135deg, #2c5aa0 0%, #1e3d6f 100%)',
              border: 'none',
              borderRadius: '12px',
              padding: '15px 20px',
              width: '100%',
              textAlign: 'left',
              cursor: locationLoading ? 'not-allowed' : 'pointer',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '16px',
              color: 'white',
              fontWeight: '600'
            }}
            onClick={useCurrentLocation}
            disabled={locationLoading}
          >
            <span style={{ marginRight: '10px', fontSize: '18px' }}>
              {locationLoading ? '⏳' : enableHighAccuracy ? '🎯' : '📍'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px' }}>
                {locationLoading 
                  ? 'Getting Your Location...' 
                  : isCapacitorApp && isPermanentlyDenied
                  ? 'Open Settings to Enable Location'
                  : enableHighAccuracy 
                  ? 'Use High Accuracy Location'
                  : 'Use Your Current Location'
                }
              </div>
              {locationAttempts > 0 && !locationLoading && (
                <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                  {isCapacitorApp 
                    ? isPermanentlyDenied 
                      ? 'Tap to open app settings automatically'
                      : 'Tap to request permission again'
                    : `Attempt ${locationAttempts + 1} • ${enableHighAccuracy ? 'High Accuracy' : 'Standard'}`
                  }
                </div>
              )}
            </div>
          </button>

          {/* Selected Address */}
          <div style={{ marginBottom: '15px' }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 600,
              marginBottom: '5px',
              color: '#333',
              margin: '0 0 5px 0'
            }}>
              {selectedLocation?.name || 'Select Location'}
            </h3>
            <p style={{
              color: '#666',
              fontSize: '14px',
              lineHeight: 1.4,
              margin: 0
            }}>
              {selectedLocation?.address || 'Please select a location on the map or use current location'}
            </p>
            {selectedLocation?.accuracy && (
              <p style={{
                color: '#9ca3af',
                fontSize: '12px',
                margin: '4px 0 0 0'
              }}>
                Accuracy: ±{Math.round(selectedLocation.accuracy)}m
              </p>
            )}
          </div>

          {/* Confirm Button */}
          <button 
            style={{
              background: selectedLocation 
                ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' 
                : '#e5e7eb',
              color: selectedLocation ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '12px',
              padding: '18px',
              width: '100%',
              fontSize: '17px',
              fontWeight: 700,
              cursor: selectedLocation ? 'pointer' : 'not-allowed',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}
            onClick={handleConfirmLocation}
            disabled={!selectedLocation}
          >
            CONFIRM LOCATION
          </button>
        </div>
      </div>
    </>
  );
};

export default Map;
