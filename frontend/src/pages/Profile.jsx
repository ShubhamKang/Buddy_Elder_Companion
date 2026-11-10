import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', mobileNumber: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setForm({
            fullName: data.fullName || '',
            mobileNumber: data.mobileNumber || (user.phoneNumber || '').replace('+91', ''),
            email: data.email || ''
          });
        } else {
          setForm({
            fullName: user.displayName || '',
            mobileNumber: (user.phoneNumber || '').replace('+91', ''),
            email: user.email || ''
          });
        }
      } catch (_) {}
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const ref = doc(db, 'users', user.uid);
      await setDoc(
        ref,
        {
          fullName: form.fullName.trim(),
          mobileNumber: form.mobileNumber,
          email: form.email.trim()
        },
        { merge: true }
      );
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
    try {
      const user = auth.currentUser;
      if (!user) return;
      await deleteDoc(doc(db, 'users', user.uid));
      try {
        await user.delete();
      } catch (e) {
        console.warn('Auth deletion needs recent login. Only data removed.', e);
      }
      await auth.signOut();
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


