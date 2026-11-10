import React, { useCallback, useEffect, useState } from 'react';
import './Sos.css';
import PageHeader from '../components/ui/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import ConfirmModal from '../components/ui/ConfirmModal';
import { EmptyState, Spinner, PageLoader, Banner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../auth/AuthContext';
import { sosApi } from '../api/endpoints';
import {
  formatDateTime,
  errorMessage,
  getSavedLocation,
  getCurrentPosition,
} from '../utils/format';

const RELATIONSHIPS = ['Family', 'Friend', 'Neighbour', 'Doctor', 'Other'];
const EMPTY_FORM = { name: '', phone: '', relationship: 'Family' };

const mapLink = (lat, lng) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

/** Resolve a position: live GPS (2s patience) -> saved location -> none. */
async function resolveLocation() {
  try {
    const pos = await Promise.race([
      getCurrentPosition({ timeout: 2000, maximumAge: 60000 }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2200)),
    ]);
    return { latitude: pos.lat, longitude: pos.lng };
  } catch (_) {
    const saved = getSavedLocation();
    if (saved && saved.lat != null && saved.lng != null) {
      return { latitude: saved.lat, longitude: saved.lng };
    }
    return {};
  }
}

export default function Sos() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isElder = user?.role === 'ELDER';

  const [contacts, setContacts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sentAlert, setSentAlert] = useState(null);

  const [resolvingId, setResolvingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [adding, setAdding] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = useCallback(async () => {
    const [c, a] = await Promise.all([
      sosApi.listContacts(),
      sosApi.listAlerts({ size: 10, sort: 'createdAt,desc' }),
    ]);
    return { contacts: Array.isArray(c) ? c : c?.content || [], alerts: a?.content || [] };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const data = await load();
      setContacts(data.contacts);
      setAlerts(data.alerts);
    } catch (err) {
      toast(errorMessage(err, 'Could not refresh.'), 'error');
    }
  }, [load, toast]);

  const initialLoad = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    load()
      .then((data) => {
        if (!active) return;
        setContacts(data.contacts);
        setAlerts(data.alerts);
      })
      .catch((err) => active && setError(errorMessage(err, 'Could not load your SOS details.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  useEffect(() => {
    if (authLoading || !isElder) return undefined;
    return initialLoad();
  }, [authLoading, isElder, initialLoad]);

  const activeAlerts = alerts.filter((a) => a.status === 'ACTIVE');

  const sendSos = async () => {
    setSending(true);
    try {
      const loc = await resolveLocation();
      const result = await sosApi.trigger({ ...loc, note: note.trim() || undefined });
      setSentAlert(result);
      setConfirmOpen(false);
      setNote('');
      toast('SOS sent - help is on the way', 'success');
      await refresh();
    } catch (err) {
      toast(errorMessage(err, 'Could not send SOS. Please call your contact directly.'), 'error');
    } finally {
      setSending(false);
    }
  };

  const resolveAlert = async (id) => {
    setResolvingId(id);
    try {
      await sosApi.resolve(id);
      toast('Glad you are safe. Alert resolved.', 'success');
      setSentAlert(null);
      await refresh();
    } catch (err) {
      toast(errorMessage(err, 'Could not resolve the alert.'), 'error');
    } finally {
      setResolvingId(null);
    }
  };

  const addContact = async (e) => {
    e.preventDefault();
    const name = form.name.trim();
    const phone = form.phone.trim();
    if (!name) return setFormError('Please enter a name.');
    if (!/^\+?[0-9\s-]{7,15}$/.test(phone)) return setFormError('Please enter a valid phone number.');
    setFormError('');
    setAdding(true);
    try {
      await sosApi.addContact({ name, phone, relationship: form.relationship });
      toast('Contact added', 'success');
      setForm(EMPTY_FORM);
      await refresh();
    } catch (err) {
      toast(errorMessage(err, 'Could not add contact.'), 'error');
    } finally {
      setAdding(false);
    }
  };

  const removeContact = async () => {
    setRemoving(true);
    try {
      await sosApi.removeContact(toRemove.id);
      toast('Contact removed', 'success');
      setToRemove(null);
      await refresh();
    } catch (err) {
      toast(errorMessage(err, 'Could not remove contact.'), 'error');
    } finally {
      setRemoving(false);
    }
  };

  const renderBody = () => {
    if (authLoading || loading) return <PageLoader label="Loading your safety details…" />;
    if (!isElder) {
      return (
        <EmptyState
          icon="🛡️"
          title="SOS is for elders"
          text="Only elder accounts can raise an emergency alert."
        />
      );
    }
    if (error) {
      return (
        <Banner type="error">
          <div>{error}</div>
          <button type="button" className="ui-btn ui-btn-sm" style={{ marginTop: 8 }} onClick={initialLoad}>
            Try again
          </button>
        </Banner>
      );
    }

    const contactCount = contacts.length;
    return (
      <>
        {sentAlert && (
          <div className="ui-banner sos-sent" role="status">
            <span aria-hidden="true">🚨</span>
            <div>
              SOS sent - help is on the way
              <div className="ui-small">
                {sentAlert.contactsNotified ?? 0} contact(s) alerted. Stay where you are if you can.
              </div>
            </div>
          </div>
        )}

        {activeAlerts.map((a) => (
          <div key={a.id} className="ui-card sos-active">
            <div className="ui-row ui-between">
              <div className="ui-card-title" style={{ margin: 0 }}>🚨 Active alert</div>
              <StatusChip status="ACTIVE" />
            </div>
            <p className="ui-muted" style={{ margin: '8px 0 4px' }}>
              Raised {formatDateTime(a.createdAt)}
            </p>
            {a.note ? <p style={{ margin: '4px 0', color: '#111827' }}>“{a.note}”</p> : null}
            {a.latitude != null && a.longitude != null && (
              <a className="sos-link" href={mapLink(a.latitude, a.longitude)} target="_blank" rel="noopener noreferrer">
                📍 View location on map
              </a>
            )}
            <button
              type="button"
              className="ui-btn ui-btn-success ui-btn-lg ui-btn-block"
              style={{ marginTop: 14, minHeight: 52 }}
              onClick={() => resolveAlert(a.id)}
              disabled={resolvingId === a.id}
            >
              {resolvingId === a.id ? <Spinner /> : null} ✅ I&apos;m safe - resolve
            </button>
          </div>
        ))}

        <div className="sos-hero">
          <div className="sos-btn-wrap">
            <button
              type="button"
              className="sos-btn"
              onClick={() => setConfirmOpen(true)}
              disabled={sending}
              aria-label="Send SOS emergency alert"
            >
              SOS
            </button>
          </div>
          <p className="sos-caption">Tap to alert your emergency contacts and our care team</p>
        </div>

        <div className="ui-section-title">Emergency contacts</div>
        {contactCount === 0 && (
          <Banner type="warn">Add at least one emergency contact so we can alert someone you trust.</Banner>
        )}
        {contactCount > 0 && (
          <div className="ui-card">
            {contacts.map((c) => (
              <div key={c.id} className="sos-contact">
                <Avatar name={c.name} size="sm" />
                <div className="ui-grow">
                  <div className="ui-strong ui-clip">{c.name}</div>
                  <a className="sos-phone" href={`tel:${c.phone}`}>📞 {c.phone}</a>
                </div>
                {c.relationship ? <span className="ui-chip info">{c.relationship}</span> : null}
                <button
                  type="button"
                  className="ui-btn ui-btn-ghost sos-remove"
                  onClick={() => setToRemove(c)}
                  aria-label={`Remove ${c.name}`}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}

        <form className="ui-card" onSubmit={addContact} noValidate>
          <h2 className="ui-card-title">➕ Add contact</h2>
          <div className="ui-field">
            <label className="ui-label" htmlFor="sos-name">Name</label>
            <input
              id="sos-name"
              className="ui-input"
              value={form.name}
              maxLength={80}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Anita (daughter)"
            />
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="sos-phone">Phone</label>
            <input
              id="sos-phone"
              className="ui-input"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+91 98765 43210"
            />
            <div className="ui-hint">Include the country code, e.g. +91.</div>
          </div>
          <div className="ui-field">
            <label className="ui-label" htmlFor="sos-rel">Relationship</label>
            <select
              id="sos-rel"
              className="ui-select"
              value={form.relationship}
              onChange={(e) => setForm({ ...form, relationship: e.target.value })}
            >
              {RELATIONSHIPS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          {formError ? <div className="ui-error-text" role="alert">{formError}</div> : null}
          <button type="submit" className="ui-btn ui-btn-primary ui-btn-block" style={{ minHeight: 48 }} disabled={adding}>
            {adding ? <Spinner /> : null} Save contact
          </button>
        </form>

        <div className="ui-section-title">Alert history</div>
        {alerts.length === 0 ? (
          <EmptyState icon="🌿" title="No alerts yet" text="That's good news. Past SOS alerts will show up here." />
        ) : (
          <div className="ui-list">
            {alerts.map((a) => (
              <div key={a.id} className="ui-item" style={{ cursor: 'default' }}>
                <div className="ui-grow">
                  <div className="ui-item-title">{formatDateTime(a.createdAt)}</div>
                  <div className="ui-item-sub">
                    {a.note || 'SOS alert'}
                  </div>
                </div>
                <StatusChip status={a.status} />
              </div>
            ))}
          </div>
        )}

        <ConfirmModal
          open={confirmOpen}
          danger
          busy={sending}
          title="Send SOS now?"
          text={
            contactCount > 0
              ? `${contactCount} emergency contact${contactCount === 1 ? '' : 's'} and our care team will be alerted with your location.`
              : 'You have no emergency contacts yet, but our care team will be alerted with your location.'
          }
          confirmLabel={sending ? 'Sending…' : 'Yes, send SOS'}
          cancelLabel="Cancel"
          onConfirm={sendSos}
          onCancel={() => !sending && setConfirmOpen(false)}
        >
          <div className="ui-field">
            <label className="ui-label" htmlFor="sos-note">What&apos;s happening? (optional)</label>
            <textarea
              id="sos-note"
              className="ui-textarea"
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. I fell and cannot get up"
            />
          </div>
        </ConfirmModal>

        <ConfirmModal
          open={!!toRemove}
          danger
          busy={removing}
          title="Remove contact?"
          text={toRemove ? `${toRemove.name} will no longer be alerted in an emergency.` : ''}
          confirmLabel="Remove"
          onConfirm={removeContact}
          onCancel={() => !removing && setToRemove(null)}
        />
      </>
    );
  };

  return (
    <div className="ui-page">
      <PageHeader title="SOS & Emergency" subtitle="Help is one tap away" />
      <div className="ui-container">{renderBody()}</div>
      <BottomNavBar />
    </div>
  );
}
