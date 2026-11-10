import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { profilesApi } from '../api/profiles';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [form, setForm] = useState({ fullName: '', mobileNumber: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      // Seed from the auth user, then try to enrich from the profile endpoint.
      let next = {
        fullName: user.fullName || '',
        mobileNumber: (user.phone || '').replace('+91', ''),
        email: user.email || ''
      };
      try {
        const profile =
          user.role === 'BUDDY'
            ? await profilesApi.getMyBuddyProfile()
            : await profilesApi.getMyElderProfile();
        if (profile) {
          next = {
            fullName: profile.fullName || next.fullName,
            mobileNumber: (profile.phone || next.mobileNumber || '').replace('+91', ''),
            email: profile.email || next.email
          };
        }
      } catch (_) {
        // Profile may not be set up yet (404) — fall back to auth user values.
      }
      if (active) {
        setForm(next);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSaving(true);
    try {
      const body = {
        fullName: form.fullName.trim(),
        phone: form.mobileNumber,
        email: form.email.trim()
      };
      if (user?.role === 'BUDDY') {
        await profilesApi.upsertBuddyProfile(body);
      } else {
        await profilesApi.upsertElderProfile(body);
      }
      alert('Profile updated');
      navigate(-1);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    // TODO: backend endpoint for account deletion. For now, log the user out.
    try {
      logout();
      navigate('/');
    } catch (e) {
      console.error(e);
      alert('Could not delete account. Please try again later.');
    }
  };

  if (loading) return null;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button className="back-btn" onClick={() => navigate('/home')}>←</button>
        <h2>Profile</h2>
      </div>

      <form className="profile-form" onSubmit={handleSubmit}>
        <label className="label">Name *</label>
        <input
          className="input"
          type="text"
          value={form.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          placeholder="Your name"
          required
        />

        <label className="label">Mobile Number *</label>
        <input
          className="input"
          type="tel"
          value={form.mobileNumber}
          onChange={(e) => handleChange('mobileNumber', e.target.value)}
          placeholder="Mobile number"
          inputMode="numeric"
          readOnly
        />

        <label className="label">Email Address *</label>
        <input
          className="input"
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="Enter your email"
          required
        />

        <button className="submit-btn" type="submit" disabled={saving || !form.fullName.trim()}>
          {saving ? 'Saving...' : 'Submit'}
        </button>
      </form>

      <hr className="divider" />

      <div className="delete-section">
        <div className="delete-title">Delete Account</div>
        <p className="delete-note">
          Deleting your account will remove all your orders, wallet amount and any active referral.
        </p>
        <button className="delete-btn" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
      </div>

      {showDeleteConfirm && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Delete account?</h3>
            <p className="modal-text">This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;


