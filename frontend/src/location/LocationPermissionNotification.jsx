import React, { useEffect, useState } from 'react';
import './LocationPopup.css';
import IndiaMapIcon from './IndiaMapIcon';
import { useAuth } from '../auth/AuthContext';
import { addressesApi } from '../api/profiles';
import locationService from '../services/locationService';
import { useNavigate } from 'react-router-dom';

const LocationPermissionNotification = ({ open, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [saved, setSaved] = useState([]);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const fetchSaved = async () => {
      if (!user) {
        setSaved([]);
        return;
      }
      try {
        const page = await addressesApi.list();
        const content = page?.content || [];
        const mapped = content.map((a) => ({
          id: a.id,
          label: a.label,
          address: [a.line1, a.line2, a.city, a.state, a.postalCode].filter(Boolean).join(', '),
          lat: a.latitude,
          lng: a.longitude,
        }));
        if (!cancelled) setSaved(mapped);
      } catch (_) {
        if (!cancelled) setSaved([]);
      }
    };
    fetchSaved();
    return () => { cancelled = true; };
  }, [open, user]);

  if (!open) return null;

  const saveLoc = (loc) => {
    try {
      localStorage.setItem('userLocation', JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: loc }));
    } catch (_) {}
    onClose && onClose();
  };

  const useCurrent = async () => {
    if (detecting) return;
    setDetecting(true);
    try {
      const pos = await locationService.getCurrentLocation({ enableHighAccuracy: true, timeout: 15000 });
      if (!pos?.latitude) { navigate('/select-location'); return; }
      const coord = {
        address: `📍 ${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`,
        name: 'Current Location', lat: pos.latitude, lng: pos.longitude, type: 'current'
      };
      saveLoc(coord);
      try {
        const addr = await locationService.getAddressFromCoords(pos.latitude, pos.longitude);
        if (addr?.formatted) {
          const finalLoc = { ...coord, address: addr.formatted };
          localStorage.setItem('userLocation', JSON.stringify(finalLoc));
          window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: finalLoc }));
        }
      } catch (_) {}
    } catch {
      navigate('/select-location');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="location-popup-overlay" onClick={onClose}>
      <div className="location-popup" onClick={(e)=>e.stopPropagation()}>
        <button className="location-popup-close" onClick={onClose}>✕</button>
        <div className="location-popup-content">
          <div className="location-popup-icon"><IndiaMapIcon/></div>
          <h3 className="location-popup-title">Location permission is off</h3>
          <p className="location-popup-subtitle">Please enable location permission for better delivery experience</p>

          <button className="location-popup-primary-btn" onClick={useCurrent} disabled={detecting}>
            {detecting ? <span className="button-loader"/> : 'Continue'}
          </button>

          <div className="saved-addresses-section">
            <div className="saved-addresses-title">Select your address</div>
            {saved.length === 0 ? (
              <div className="address-text" style={{ padding: 8 }}>No saved addresses</div>
            ) : (
              saved.slice(0,3).map(a => (
                <button key={a.id} className="saved-address-item" onClick={() => saveLoc({ address: a.address, name: a.label || a.name || 'Address', lat: a.lat, lng: a.lng, type: 'saved' })}>
                  <div className="address-icon">📍</div>
                  <div className="address-details">
                    <div className="address-label">{a.label || a.name || 'Address'}</div>
                    <div className="address-text">{a.address}</div>
                  </div>
                  <div className="arrow">›</div>
                </button>
              ))
            )}
            <button className="view-more-btn" onClick={() => navigate('/addresses?mode=location')}>See All →</button>
          </div>

          <button className="location-popup-manual-btn" onClick={() => navigate('/select-location')}>
            <span className="manual-icon">🔎</span>
            Search your Location
            <span className="arrow">→</span>
          </button>
        </div>
        <div className="location-popup-footer"><p>We only use your location to improve service</p></div>
      </div>
    </div>
  );
};

export default LocationPermissionNotification;