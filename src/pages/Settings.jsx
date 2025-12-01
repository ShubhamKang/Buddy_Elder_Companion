import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ fullName: '', mobileNumber: '' });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) setProfile(snap.data());
      } catch (_) {}
    });
    return () => unsub();
  }, []);

  return (
    <div className="settings-page">
      <div className="settings-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <h2>Settings</h2>
      </div>

      <div className="settings-card profile-summary">
        <div className="avatar">👤</div>
        <div className="profile-texts">
          <div className="name">{profile.fullName || 'Guest'}</div>
          <div className="mobile">{profile.mobileNumber || ''}</div>
          <div className="badge">Member</div>
        </div>
        <button className="renew-btn">Renew Now</button>
      </div>

      <div className="settings-grid">
        <button className="settings-tile">🛍️ Your Orders</button>
        <button className="settings-tile" onClick={() => navigate('/needhelp')}>💬 Help & Support</button>
        <button className="settings-tile">💰 Buddy Cash</button>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Your Information</h3>
        <div className="settings-list">
          <button className="settings-row" onClick={() => navigate('/needhelp')}>💬 Help & Support</button>
          <button className="settings-row">↩️ Refunds</button>
          <button className="settings-row" onClick={() => navigate('/addresses?mode=select&return=settings')}>📍 Saved Addresses</button>
          <button className="settings-row" onClick={() => navigate('/profile')}>👤 Profile</button>
          <button className="settings-row">🎁 Rewards</button>
          <button className="settings-row">💳 Payment Management</button>
        </div>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Other Information</h3>
        <div className="settings-list">
          <button className="settings-row">⭐ Suggest Products</button>
          <button className="settings-row">🔔 Notifications</button>
          <button className="settings-row">ℹ️ General Info</button>
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
                onClick={() => auth.signOut().then(() => navigate('/'))}
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


