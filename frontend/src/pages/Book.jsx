import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import BottomNavBar from '../components/BottomNavBar';
import { Banner, EmptyState, ListSkeleton, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { bookingsApi } from '../api/endpoints';
import { addressesApi } from '../api/profiles';
import { errorMessage, getSavedLocation } from '../utils/format';
import { homePathFor } from '../utils/nav';
import './Bookings.css';

const QUICK = ['🛒 Groceries', '💊 Medicine pickup', '🚶 Walk & company', '🏥 Hospital visit', '🧹 Home help', '🍳 Cooking'];

const toLocalInput = (d) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

export default function Book() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const buddyName = params.get('buddy') ? params.get('name') || 'this buddy' : '';

  const [type, setType] = useState('INSTANT');
  const [when, setWhen] = useState('');
  const [notes, setNotes] = useState('');
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const saved = useMemo(() => {
    const s = getSavedLocation();
    return s && s.lat != null && s.lng != null ? s : null;
  }, []);
  const minWhen = useMemo(() => toLocalInput(new Date(Date.now() + 10 * 60000)), []);

  useEffect(() => {
    if (user?.role !== 'ELDER') return undefined;
    let active = true;
    setLoading(true);
    setLoadError('');
    addressesApi
      .list({ size: 50 })
      .then((res) => {
        if (!active) return;
        const list = res?.content || [];
        setAddresses(list);
        const primary = list.find((a) => a.primary) || list[0];
        if (primary) setSelected(`a:${primary.id}`);
        else if (saved) setSelected('saved');
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(errorMessage(err, 'Could not load your addresses.'));
        if (saved) setSelected('saved');
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user?.role, saved, reloadKey]);

  if (user?.role !== 'ELDER') {
    return (
      <div className="ui-page">
        <PageHeader title="Book a buddy" />
        <div className="ui-container">
          <EmptyState
            icon="🙋"
            title="Only elders can book"
            text="Booking a buddy is available for elder accounts. You can review requests from your bookings."
            action={
              <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate(homePathFor(user?.role))}>
                Back to home
              </button>
            }
          />
        </div>
        <BottomNavBar />
      </div>
    );
  }

  const addNote = (text) => setNotes((n) => (n.trim() ? `${n.trim()}, ${text}` : text));

  const location = () => {
    if (selected === 'saved' && saved) {
      return {
        addressLine: saved.address || saved.name || 'Current location',
        city: saved.city || undefined,
        latitude: saved.lat,
        longitude: saved.lng,
      };
    }
    const a = addresses.find((x) => `a:${x.id}` === selected);
    if (!a) return null;
    return {
      addressLine: [a.line1, a.line2].filter(Boolean).join(', '),
      city: a.city,
      latitude: a.latitude,
      longitude: a.longitude,
    };
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setFormError('');
    const loc = location();
    if (!loc) return setFormError('Please choose where the buddy should come.');
    let scheduledAt;
    if (type === 'SCHEDULED') {
      const d = new Date(when);
      if (!when || Number.isNaN(d.getTime())) return setFormError('Please pick a date and time.');
      if (d.getTime() <= Date.now()) return setFormError('The time must be in the future.');
      scheduledAt = d.toISOString();
    }
    const text = notes.trim();
    const serviceNotes = buddyName ? `Preferred buddy: ${buddyName}. ${text}`.trim() : text;
    const body = { type, serviceNotes, ...loc };
    if (scheduledAt) body.scheduledAt = scheduledAt;
    setSubmitting(true);
    try {
      const created = await bookingsApi.create(body);
      toast('Request sent! Finding a buddy…', 'success');
      navigate(`/bookings/${created.id}`);
    } catch (err) {
      const msg = errorMessage(err, 'Could not create the booking.');
      setFormError(msg);
      toast(msg, 'error');
      setSubmitting(false);
    }
  };

  const noLocation = !loading && addresses.length === 0 && !saved;

  return (
    <div className="ui-page">
      <PageHeader title="Book a buddy" backTo="/home" />
      <div className="ui-container">
        <div className="ui-hero">
          <h2>Need a hand?</h2>
          <p>Tell us what you need and a nearby buddy will accept.</p>
        </div>

        {buddyName ? (
          <Banner type="info" icon="💜">
            You're asking for <strong>{buddyName}</strong>. Your request goes to nearby buddies - {buddyName} is noted as your preferred buddy.
          </Banner>
        ) : null}

        <form onSubmit={submit} className="ui-stack">
          <div className="ui-card">
            <div className="ui-card-title">🕒 When?</div>
            <div className="ui-segment" role="group" aria-label="When">
              <button type="button" className={type === 'INSTANT' ? 'active' : ''} onClick={() => setType('INSTANT')}>⚡ Right now</button>
              <button type="button" className={type === 'SCHEDULED' ? 'active' : ''} onClick={() => setType('SCHEDULED')}>📅 Schedule</button>
            </div>
            {type === 'SCHEDULED' ? (
              <div className="ui-field" style={{ marginTop: 14 }}>
                <label className="ui-label" htmlFor="bk-when">Date and time</label>
                <input id="bk-when" type="datetime-local" className="ui-input" min={minWhen} value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
            ) : null}
          </div>

          <div className="ui-card">
            <div className="ui-card-title">📝 What do you need help with?</div>
            <textarea
              className="ui-textarea"
              rows={4}
              maxLength={1000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Please pick up my medicines from the pharmacy"
              aria-label="What do you need help with?"
            />
            <div className="bk-quick">
              {QUICK.map((q) => (
                <button type="button" key={q} onClick={() => addNote(q)}>{q}</button>
              ))}
            </div>
          </div>

          <div className="ui-card">
            <div className="ui-card-title">📍 Where?</div>
            {loading ? <ListSkeleton rows={2} height={64} /> : null}
            {loadError ? (
              <Banner type="error">
                {loadError}{' '}
                <button type="button" className="ui-btn ui-btn-sm" onClick={() => setReloadKey((k) => k + 1)}>Retry</button>
              </Banner>
            ) : null}
            {!loading ? (
              <div className="ui-stack" role="radiogroup" aria-label="Location">
                {addresses.map((a) => {
                  const key = `a:${a.id}`;
                  return (
                    <button type="button" role="radio" aria-checked={selected === key} key={a.id} className={`bk-radio ${selected === key ? 'selected' : ''}`} onClick={() => setSelected(key)}>
                      <span className="bk-dot" />
                      <span className="ui-grow">
                        <span className="ui-strong">{a.label || 'Address'}</span>
                        <span className="ui-small ui-muted" style={{ display: 'block' }}>{[a.line1, a.city].filter(Boolean).join(', ')}</span>
                      </span>
                      {a.primary ? <span className="ui-chip info">Primary</span> : null}
                    </button>
                  );
                })}
                {saved ? (
                  <button type="button" role="radio" aria-checked={selected === 'saved'} className={`bk-radio ${selected === 'saved' ? 'selected' : ''}`} onClick={() => setSelected('saved')}>
                    <span className="bk-dot" />
                    <span className="ui-grow">
                      <span className="ui-strong">📍 Use my current location</span>
                      <span className="ui-small ui-muted" style={{ display: 'block' }}>{[saved.address || saved.name, saved.city].filter(Boolean).join(', ')}</span>
                    </span>
                  </button>
                ) : null}
              </div>
            ) : null}
            {noLocation ? (
              <Banner type="warn">
                Add an address so your buddy knows where to come.{' '}
                <button type="button" className="ui-btn ui-btn-sm ui-btn-primary" onClick={() => navigate('/addresses')}>Add address</button>
              </Banner>
            ) : null}
          </div>

          {formError ? <Banner type="error">{formError}</Banner> : null}

          <button type="submit" className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block" disabled={submitting || loading}>
            {submitting ? <Spinner /> : '🚀 Request a buddy'}
          </button>
        </form>
      </div>
      <BottomNavBar />
    </div>
  );
}
