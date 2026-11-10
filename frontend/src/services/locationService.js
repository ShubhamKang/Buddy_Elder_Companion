// Web-only lightweight location service (no Capacitor)
const GeolocationAPI = {
  async getCurrentPosition(options) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject({ code: 'UNSUPPORTED', message: 'Geolocation not supported' });
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, (err) => reject(err), options);
    });
  },
  async watchPosition(options, cb) {
    if (!navigator.geolocation) return null;
    const id = navigator.geolocation.watchPosition((pos) => cb(pos, null), (err) => cb(null, err), options);
    return id;
  },
  async clearWatch({ id }) {
    if (id != null && navigator.geolocation) navigator.geolocation.clearWatch(id);
  }
};
const Platform = { isNative: false, getPlatform: () => 'web' };
const App = { openSettings: async () => {} };

/**
 * Enhanced Location Service - Zepto/Swiggy Style
 * Handles all permission scenarios and provides native app experience
 */
class LocationService {
  constructor() {
    this.isNative = Platform.isNative;
    this.platform = Platform.getPlatform();
    this.permissionStatus = null;
    this.locationWatchId = null;
  }

  /**
   * Attempt to request the OS high-accuracy dialog (Android) if not already enabled.
   * Uses cordova-plugin-request-location-accuracy when available. Safe-no-op on web.
   */
  async ensureHighAccuracy() {
    if (!this.isNative || this.platform !== 'android') return;

    const LA = window?.cordova?.plugins?.locationAccuracy;
    if (!LA) return; // plugin not installed – skip

    return new Promise((resolve) => {
      try {
        LA.canRequest((canRequest) => {
          if (!canRequest) return resolve(false);

          LA.request(LA.REQUEST_PRIORITY_HIGH_ACCURACY,
            () => {
              console.log('[LocationService] High-accuracy location enabled');
              resolve(true);
            },
            (err) => {
              console.warn('[LocationService] High-accuracy request failed', err);
              resolve(false);
            }
          );
        });
      } catch (e) {
        console.warn('[LocationService] ensureHighAccuracy exception', e);
        resolve(false);
      }
    });
  }

  /**
   * Check current permission status
   */
  async checkPermissionStatus() {
    try {
      // Web only
      if (navigator.permissions) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        return result.state;
      }
      return 'prompt';
    } catch (error) {
      console.error('Permission check error:', error);
      return 'prompt';
    }
  }

  /**
   * Request location permission with proper handling
   */
  async requestPermission() {
    try {
      const currentStatus = await this.checkPermissionStatus();
      
      if (currentStatus === 'granted') {
        return { status: 'granted', needsSettings: false };
      }
      
      if (currentStatus === 'denied') {
        // Permission was previously denied
        return { status: 'denied', needsSettings: true };
      }
      
      // Request permission
      // Web - trigger permission prompt by getting location
      try {
        await this.getCurrentLocation();
        return { status: 'granted', needsSettings: false };
      } catch (error) {
        if (error.code === 1 || error.code === 'PERMISSION_DENIED') {
          return { status: 'denied', needsSettings: true };
        }
        throw error;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return { status: 'error', error: error.message, needsSettings: false };
    }
  }

  /**
   * Get current location with timeout and retry logic
   */
  async getCurrentLocation(options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      // Web-only implementation
      const position = await GeolocationAPI.getCurrentPosition(finalOptions);
      return {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: position.timestamp
      };
    } catch (error) {
      throw this.handleLocationError(error);
    }
  }

  /**
   * Watch location changes (for live tracking)
   */
  async watchLocation(callback, options = {}) {
    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      this.locationWatchId = await GeolocationAPI.watchPosition(finalOptions, (position, err) => {
        if (err) {
          callback(null, this.handleLocationError(err));
        } else {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          }, null);
        }
      });
      
      return this.locationWatchId;
    } catch (error) {
      throw this.handleLocationError(error);
    }
  }

  /**
   * Stop watching location
   */
  async clearWatch() {
    if (this.locationWatchId) {
      await GeolocationAPI.clearWatch({ id: this.locationWatchId });
      this.locationWatchId = null;
    }
  }

  /**
   * Open app settings (for native apps)
   */
  async openAppSettings() {
    if (this.isNative && this.platform === 'android') {
      try {
        // Try to open app settings using Capacitor App plugin
        await App.openSettings();
        return true;
      } catch (error) {
        console.error('Failed to open settings:', error);
        return false;
      }
    }
    return false;
  }

  /**
   * Handle location errors consistently
   */
  handleLocationError(error) {
    const errorMap = {
      1: { code: 'PERMISSION_DENIED', message: 'Location permission denied' },
      2: { code: 'POSITION_UNAVAILABLE', message: 'Location unavailable' },
      3: { code: 'TIMEOUT', message: 'Location request timed out' }
    };

    if (error.code && errorMap[error.code]) {
      return { ...errorMap[error.code], originalError: error };
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'Unknown location error',
      originalError: error
    };
  }

  /**
   * Get human-readable address from coordinates (reverse geocoding)
   */
  async getAddressFromCoords(latitude, longitude) {
    // Prefer Google Maps Geocoder to avoid CORS
    try {
      if (window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        const res = await new Promise((resolve) => {
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const r = results[0];
              resolve({
                formatted: r.formatted_address,
                components: {
                  area: r.address_components.find(c=>c.types.includes('sublocality'))?.long_name || '',
                  city: r.address_components.find(c=>c.types.includes('locality'))?.long_name || '',
                  state: r.address_components.find(c=>c.types.includes('administrative_area_level_1'))?.long_name || '',
                  country: r.address_components.find(c=>c.types.includes('country'))?.long_name || '',
                  pincode: r.address_components.find(c=>c.types.includes('postal_code'))?.long_name || ''
                }
              });
            } else {
              resolve(null);
            }
          });
        });
        if (res) return res;
      }
    } catch (e) {
      // fall through to REST
    }

    try {
      const key = 'AIzaSyC62wo52XfJDOBnJc6VAQDDbse3a-KKy-k';
      const resp = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${key}`);
      if (resp.ok) {
        const data = await resp.json();
        const r = data.results?.[0];
        if (r) {
          return {
            formatted: r.formatted_address,
            components: {}
          };
        }
      }
    } catch (_) {}

    // Final fallback: coordinates only
    return null;
  }

  /**
   * Check if location services are enabled on device
   */
  async isLocationEnabled() {
    if (this.isNative) {
      try {
        // Try to get location with short timeout
        await this.getCurrentLocation({ timeout: 2000 });
        return true;
      } catch (error) {
        if (error.code === 'POSITION_UNAVAILABLE') {
          return false;
        }
        return true; // Assume enabled for other errors
      }
    }
    return true; // Always true for web
  }
}

// Export singleton instance
export const locationService = new LocationService();
export default locationService; 