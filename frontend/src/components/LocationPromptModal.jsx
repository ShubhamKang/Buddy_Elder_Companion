import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';
import locationService from '../services/locationService';

const LocationPromptModal = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!open) return;
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setAddresses([]);
        setFetching(false);
        return;
      }
      try {
        const snap = await getDocs(collection(db, 'users', user.uid, 'addresses'));
        setAddresses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (_) {
        setAddresses([]);
      } finally {
        setFetching(false);
      }
    });
    return () => unsub && unsub();
  }, [open]);

  if (!open) return null;

  const saveAndClose = (loc) => {
    try {
      localStorage.setItem('userLocation', JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: loc }));
    } catch (_) {}
    if (onClose) onClose();
  };

  const handleUseCurrentLocation = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (!('geolocation' in navigator)) {
        navigate('/select-location');
        return;
      }
      const pos = await locationService.getCurrentLocation({ enableHighAccuracy: true, timeout: 15000 });
      if (!pos || !pos.latitude) {
        navigate('/select-location');
        return;
      }
      // Save coordinates immediately for instant feedback
      const coordLoc = {
        address: `📍 ${pos.latitude.toFixed(4)}, ${pos.longitude.toFixed(4)}`,
        name: 'Current Location',
        lat: pos.latitude,
        lng: pos.longitude,
        type: 'current'
      };
      saveAndClose(coordLoc);

      // Try to resolve human-readable address in the background
      try {
        const addr = await locationService.getAddressFromCoords(pos.latitude, pos.longitude);
        if (addr?.formatted) {
          const finalLoc = { ...coordLoc, address: addr.formatted };
          try {
            localStorage.setItem('userLocation', JSON.stringify(finalLoc));
            window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: finalLoc }));
          } catch (_) {}
        }
      } catch (_) {}
    } catch (e) {
      // If user blocked or any failure, route to map search as fallback
      navigate('/select-location');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSaved = (a) => {
    const loc = {
      address: a.address,
      name: a.label || a.name || 'Saved Address',
      lat: a.lat,
      lng: a.lng,
      type: 'saved'
    };
    saveAndClose(loc);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.sheet}>
        <div style={styles.handle} />

        <div style={styles.illustration}>📍</div>
        <h3 style={styles.title}>Location permission is off</h3>
        <p style={styles.sub}>Please enable location permission for better delivery experience</p>

        <button style={styles.cta} onClick={handleUseCurrentLocation} disabled={loading}>
          {loading ? 'Detecting...' : 'Continue'}
        </button>

        <div style={styles.sectionHeader}>
          <span style={{ fontWeight: 800 }}>Select your address</span>
          <button style={styles.link} onClick={() => navigate('/addresses?mode=location')}>See All →</button>
        </div>

        <div>
          {fetching ? (
            <div style={styles.loading}>Loading saved addresses...</div>
          ) : addresses.length === 0 ? (
            <div style={styles.empty}>No saved addresses</div>
          ) : (
            addresses.slice(0, 3).map((a) => (
              <button key={a.id} style={styles.addressRow} onClick={() => handleSelectSaved(a)}>
                <span style={{ fontSize: 18 }}>📍</span>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{a.label || a.name || 'Address'}</div>
                  <div style={{ color: '#6b7280', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.address}</div>
                </div>
                <span>›</span>
              </button>
            ))
          )}
        </div>

        <button style={styles.searchRow} onClick={() => navigate('/select-location')}>
          <span style={{ fontSize: 18 }}>🔎</span>
          <span>Search your Location</span>
        </button>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 3000,
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
  },
  sheet: {
    width: '100%', maxWidth: 520, background: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18,
    padding: 20, boxShadow: '0 -10px 30px rgba(0,0,0,0.15)'
  },
  handle: { width: 60, height: 4, background: '#e5e7eb', borderRadius: 9999, margin: '0 auto 12px' },
  illustration: { fontSize: 54, textAlign: 'center', marginTop: 6 },
  title: { textAlign: 'center', margin: '10px 0 4px', fontWeight: 800 },
  sub: { textAlign: 'center', margin: '0 0 14px', color: '#6b7280' },
  cta: { width: '100%', padding: '14px', borderRadius: 12, border: 'none', color: '#fff', fontWeight: 800,
    background: 'linear-gradient(135deg, #ff5277 0%, #ff3d5a 100%)', marginBottom: 14, cursor: 'pointer' },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' },
  link: { background: 'none', border: 'none', color: '#ef4444', fontWeight: 700, cursor: 'pointer' },
  loading: { color: '#6b7280', padding: 6 },
  empty: { color: '#9ca3af', padding: 6 },
  addressRow: { width: '100%', display: 'flex', gap: 10, alignItems: 'center', border: '1px solid #e5e7eb',
    borderRadius: 12, padding: 12, marginBottom: 8, background: '#fff', cursor: 'pointer' },
  searchRow: { width: '100%', display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
    border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, fontWeight: 700, background: '#fff', marginTop: 6, cursor: 'pointer' }
};

export default LocationPromptModal;


