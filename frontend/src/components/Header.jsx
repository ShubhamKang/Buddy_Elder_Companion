import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useUnreadCount } from '../hooks/useUnreadCount';
import { homePathFor, menuFor } from '../utils/nav';
import { getSavedLocation } from '../utils/format';
import './Header.css';

/**
 * App header: slide-down menu (role aware), delivery-style location bar,
 * search, notification bell with unread badge and the profile button.
 * Styled by Header.css.
 */
const Header = ({ userName, onLocationClick }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { count } = useUnreadCount();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, setLocation] = useState(getSavedLocation());
  const [query, setQuery] = useState('');

  // Keep the location bar in sync with the location picker.
  useEffect(() => {
    const refresh = () => setLocation(getSavedLocation());
    window.addEventListener('userLocationUpdated', refresh);
    window.addEventListener('locationUpdated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('userLocationUpdated', refresh);
      window.removeEventListener('locationUpdated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const go = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const submitSearch = (e) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/nearby?q=${encodeURIComponent(q)}` : '/nearby');
  };

  const firstName = (userName || user?.fullName || '').split(' ')[0];
  const locationName = location?.name || location?.area || location?.city || 'Set your location';

  return (
    <>
      <header className="app-header">
        <div className="header-container">
          <button
            type="button"
            className="menu-btn"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ☰
          </button>

          <div className="header-logo" onClick={() => go(homePathFor(user?.role))} role="presentation">
            <img src="/buddy_logo.png" alt="" className="logo-img" />
            <span className="logo-text">Buddy</span>
          </div>

          <button type="button" className="location-bar" onClick={onLocationClick} aria-label="Change location">
            <span className="loc-pin" aria-hidden="true">📍</span>
            <span className="loc-texts">
              <span className="loc-label">Delivering help to</span>
              <span className="loc-main">
                <span className="loc-name">{locationName}</span>
                <span className="loc-caret" aria-hidden="true">▾</span>
              </span>
            </span>
            <span className="loc-meta">
              <span className="loc-dot" />
              <span className="loc-eta">Available</span>
            </span>
          </button>

          <form className="search-form" onSubmit={submitSearch} role="search">
            <div className="search-container">
              <span className="search-icon" aria-hidden="true">🔍</span>
              <input
                className="search-input"
                type="search"
                placeholder="Search buddies, skills…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search buddies"
              />
            </div>
          </form>

          <button
            type="button"
            className="menu-btn header-bell"
            aria-label={`Notifications${count ? `, ${count} unread` : ''}`}
            onClick={() => go('/notifications')}
          >
            🔔
            {count > 0 && <span className="header-badge">{count > 9 ? '9+' : count}</span>}
          </button>

          <button type="button" className="profile-btn" aria-label="Profile" onClick={() => go('/profile')}>
            <span className="profile-icon" aria-hidden="true">👤</span>
            {firstName && <span className="profile-label">{firstName}</span>}
          </button>
        </div>
      </header>

      {menuOpen && (
        <div className="dropdown-menu">
          <div className="menu-overlay" onClick={() => setMenuOpen(false)} role="presentation" />
          <div className="menu-content" role="menu">
            {menuFor(user?.role).map((item) => (
              <button key={item.path} type="button" role="menuitem" onClick={() => go(item.path)}>
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
