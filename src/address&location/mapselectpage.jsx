import React from 'react';
import { useNavigate } from 'react-router-dom';
import Map from './mapcomp';

const MapSelectPage = () => {
  const navigate = useNavigate();

  const handleSelect = (locationData) => {
    try {
      const loc = {
        address: locationData.address,
        name: locationData.name || 'Current Location',
        lat: locationData.lat,
        lng: locationData.lng,
        type: 'current'
      };
      localStorage.setItem('userLocation', JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent('userLocationUpdated', { detail: loc }));
    } catch (_) {}
    navigate('/home');
  };

  return (
    <Map onLocationSelect={handleSelect} onClose={() => navigate('/home')} />
  );
};

export default MapSelectPage;








