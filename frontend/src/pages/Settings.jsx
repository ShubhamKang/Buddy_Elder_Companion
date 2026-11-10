import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { profilesApi } from '../api/profiles';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({ fullName: '', mobileNumber: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const roleLabel = { ELDER: 'Elder', BUDDY: 'Buddy Partner', ADMIN: 'Admin' }[user?.role] || 'Member';
  const isElder = user?.role === 'ELDER';

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) return;
      // Seed from auth user, then try to enrich from the profile endpoint.
      let next = {
        fullName: user.fullName || '',
        mobileNumber: (user.phone || '').replace('+91', '')
      };
      try {
        const p =
          user.role === 'BUDDY'
            ? await profilesApi.getMyBuddyProfile()
            : await profilesApi.getMyElderProfile();
        if (p) {
          next = {
            fullName: p.fullName || next.fullName,
            mobileNumber: (p.phone || next.mobileNumber || '').replace('+91', '')
          };
        }
      } catch (_) {
        // Profile may not be set up yet (404) — keep auth user values.
      }
      if (active) setProfile(next);
    })();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Back">←</button>
        <h2>Settings</h2>
      </div>

      <div className="settings-card profile-summary">
        <div className="avatar">👤</div>
        <div className="profile-texts">
          <div className="name">{profile.fullName || 'Guest'}</div>
          <div className="mobile">{profile.mobileNumber || ''}</div>
          <div className="badge">{roleLabel}</div>
        </div>
        <button className="renew-btn" onClick={() => navigate('/profile')}>Edit</button>
      </div>

      <div className="settings-grid">
        <button className="settings-tile" onClick={() => navigate('/bookings')}>📅 {isElder ? 'Your Bookings' : 'Your Jobs'}</button>
        <button className="settings-tile" onClick={() => navigate('/needhelp')}>💬 Help & Support</button>
        <button className="settings-tile" onClick={() => navigate('/wallet')}>💰 Wallet</button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Your Information</h3>
        <div className="settings-list">
          <button className="settings-row" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="settings-row" onClick={() => navigate('/addresses?mode=select&return=settings')}>📍 Saved Addresses</button>
          {isElder && <button className="settings-row" onClick={() => navigate('/sos')}>🆘 SOS & Emergency Contacts</button>}
          {isElder && <button className="settings-row" onClick={() => navigate('/care')}>⏰ Reminders & Care Plans</button>}
          <button className="settings-row" onClick={() => navigate('/wallet')}>💳 Wallet & Refunds</button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Other Information</h3>
        <div className="settings-list">
          <button className="settings-row" onClick={() => navigate('/notifications')}>🔔 Notifications</button>
          <button className="settings-row" onClick={() => navigate('/needhelp')}>💬 Help & Support</button>
          {user?.role === 'ADMIN' && <button className="settings-row" onClick={() => navigate('/admin')}>🛡️ Admin Console</button>}
        </div>
      </div>

      <div className="logout-wrap">
        <button className="logout-btn" onClick={() => setShowLogoutConfirm(true)}>
          Log Out
        </button>
        <div className="app-ver">App version 1.0.0</div>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Are you sure?</h3>
            <p className="modal-text">You will be logged out of Buddy.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>Cancel</button>
              <button
                className="btn-danger"
                onClick={() => {
                  logout();
                  navigate('/');
                }}
              >
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;


