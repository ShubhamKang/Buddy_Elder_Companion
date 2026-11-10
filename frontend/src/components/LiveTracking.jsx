import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Banner } from './ui/States';
import { useBookingChannel } from '../hooks/useBookingChannel';
import { timeAgo } from '../utils/format';
import './LiveTracking.css';

const THROTTLE_MS = 5000;

const haversineKm = (lat1, lng1, lat2, lng2) => {
  const rad = (x) => (x * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const ChannelStatus = ({ connected }) => (
  <span className="lt-status">
    <span className={`lt-dot ${connected ? 'on' : ''}`} />
    {connected ? 'Connected' : 'Connecting…'}
  </span>
);

export default function LiveTracking({ booking, role }) {
  const isBuddy = role === 'BUDDY';
  const [ping, setPing] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [last, setLast] = useState(null);
  const [, setNow] = useState(0);
  const watchRef = useRef(null);
  const lastSentRef = useRef(0);

  const onLocation = useCallback(
    (p) => {
      if (!isBuddy && p && p.latitude != null && p.longitude != null) setPing(p);
    },
    [isBuddy]
  );
  const { connected, sendLocation } = useBookingChannel(booking?.id, { onLocation });

  // keep "Updated x ago" fresh
  useEffect(() => {
    if (isBuddy) return undefined;
    const t = setInterval(() => setNow((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, [isBuddy]);

  const stopWatch = useCallback(() => {
    if (watchRef.current != null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  }, []);

  useEffect(() => {
    if (!isBuddy || !sharing) return undefined;
    if (!navigator.geolocation) {
      setError('Location is not supported on this device.');
      setSharing(false);
      return undefined;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setLast({ lat: latitude, lng: longitude });
        const now = Date.now();
        if (now - lastSentRef.current >= THROTTLE_MS && sendLocation(latitude, longitude)) {
          lastSentRef.current = now;
        }
      },
      (err) => {
        setError(
          err.code === 1
            ? 'Location permission was denied. Please allow location access to share.'
            : 'Could not read your location. Please try again.'
        );
        setSharing(false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return stopWatch;
  }, [isBuddy, sharing, sendLocation, stopWatch]);

  if (!booking) return null;

  if (isBuddy) {
    return (
      <div className="ui-card">
        <div className="ui-row ui-between">
          <h3 className="ui-card-title" style={{ margin: 0 }}>📍 Live location</h3>
          <ChannelStatus connected={connected} />
        </div>
        <div className="ui-divider" />
        <div className="ui-row">
          <div className="ui-grow">
            <div className="ui-strong">Share my live location</div>
            {!sharing && (
              <div className="ui-small ui-muted">Your elder can follow your arrival once you share.</div>
            )}
          </div>
          <button
            type="button"
            className={`ui-switch ${sharing ? 'on' : ''}`}
            role="switch"
            aria-checked={sharing}
            aria-label="Share my live location"
            onClick={() => {
              setError('');
              setSharing((s) => !s);
            }}
          />
        </div>
        {sharing && (
          <div className="ui-row" style={{ marginTop: 12 }}>
            <span className="lt-pulse" />
            <div>
              <div className="ui-strong">Sharing live location</div>
              <div className="ui-small ui-muted">
                {last ? `${last.lat.toFixed(5)}, ${last.lng.toFixed(5)}` : 'Finding your position…'}
              </div>
            </div>
          </div>
        )}
        {error && (
          <div style={{ marginTop: 12 }}>
            <Banner type="error">{error}</Banner>
          </div>
        )}
      </div>
    );
  }

  // ELDER view
  const buddyName = booking.buddyName || 'your buddy';
  let distanceText = '';
  if (ping && booking.latitude != null && booking.longitude != null) {
    const km = haversineKm(ping.latitude, ping.longitude, booking.latitude, booking.longitude);
    distanceText = km < 0.1 ? 'Arrived nearby' : `${km.toFixed(1)} km away`;
  }

  return (
    <div className="ui-card">
      <div className="ui-row ui-between" style={{ marginBottom: 10 }}>
        <h3 className="ui-card-title" style={{ margin: 0 }}>📍 Live location</h3>
        <ChannelStatus connected={connected} />
      </div>
      {!ping ? (
        <div className="lt-wait">⏳ Waiting for {buddyName} to share their location</div>
      ) : (
        <>
          <iframe
            className="lt-map"
            title={`Live location of ${buddyName}`}
            loading="lazy"
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${ping.longitude - 0.008}%2C${ping.latitude - 0.005}%2C${ping.longitude + 0.008}%2C${ping.latitude + 0.005}&layer=mapnik&marker=${ping.latitude}%2C${ping.longitude}`}
          />
          <div className="ui-row ui-between ui-wrap">
            <div>
              {distanceText && <div className="ui-strong">🚗 {distanceText}</div>}
              <div className="ui-small ui-muted">Updated {timeAgo(ping.timestamp || new Date().toISOString())}</div>
            </div>
            <a
              className="ui-btn ui-btn-secondary ui-btn-sm"
              style={{ minHeight: 44 }}
              href={`https://www.openstreetmap.org/?mlat=${ping.latitude}&mlon=${ping.longitude}#map=16/${ping.latitude}/${ping.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              🗺️ Open in maps
            </a>
          </div>
        </>
      )}
    </div>
  );
}
