import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import { Banner, EmptyState, ListSkeleton, PageLoader, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../auth/AuthContext';
import { bookingsApi, geoApi, walletApi } from '../api/endpoints';
import { profilesApi } from '../api/profiles';
import { errorMessage, formatMoney, getCurrentPosition, timeAgo } from '../utils/format';
import './BuddyDashboard.css';

const notify = () => window.dispatchEvent(new Event('notifications:changed'));

export default function BuddyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState(null);
  const [noProfile, setNoProfile] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [open, setOpen] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggleBusy, setToggleBusy] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [actingId, setActingId] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const [p, mine, op, w] = await Promise.all([
        profilesApi.getMyBuddyProfile().then(
          (v) => ({ ok: true, v }),
          (e) => (e?.response?.status === 404 ? { ok: true, v: null } : Promise.reject(e))
        ),
        bookingsApi.mineBuddy({ size: 100, sort: 'createdAt,desc' }),
        bookingsApi.open({ size: 5, sort: 'createdAt,asc' }),
        walletApi.get().catch(() => null),
      ]);
      if (!mounted.current) return;
      setProfile(p.v);
      setNoProfile(!p.v);
      setBookings(mine?.content || []);
      setOpen(op?.content || []);
      setWallet(w);
      setError('');
    } catch (e) {
      if (mounted.current && !silent) setError(errorMessage(e, 'Could not load your dashboard.'));
    } finally {
      if (mounted.current && !silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
    const t = setInterval(() => load(true), 20000);
    return () => clearInterval(t);
  }, [load]);

  const toggleAvailable = async () => {
    if (!profile || toggleBusy) return;
    const next = !profile.available;
    setProfile((p) => ({ ...p, available: next }));
    setToggleBusy(true);
    try {
      await profilesApi.upsertBuddyProfile({ available: next });
      toast(next ? "You're visible to elders" : "You're hidden", 'success');
    } catch (e) {
      setProfile((p) => ({ ...p, available: !next }));
      toast(errorMessage(e, 'Could not update availability.'), 'error');
    } finally {
      setToggleBusy(false);
    }
  };

  const updateLocation = async () => {
    setLocBusy(true);
    try {
      const { lat, lng } = await getCurrentPosition();
      await geoApi.updateMyLocation(lat, lng);
      toast('Base location updated', 'success');
    } catch (e) {
      toast(e?.response ? errorMessage(e, 'Could not save location.') : e.message, 'error');
    } finally {
      setLocBusy(false);
    }
  };

  const act = async (id, kind) => {
    setActingId(id);
    try {
      if (kind === 'accept') await bookingsApi.accept(id);
      else await bookingsApi.reject(id);
      toast(kind === 'accept' ? 'Request accepted 🎉' : 'Request declined', 'success');
      notify();
      await load(true);
    } catch (e) {
      toast(errorMessage(e, 'Could not update the request.'), 'error');
      load(true);
    } finally {
      if (mounted.current) setActingId(null);
    }
  };

  const firstName = (user?.fullName || profile?.fullName || 'there').trim().split(/\s+/)[0];
  const active = bookings.find((b) => b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS');
  const completed = bookings.filter((b) => b.status === 'COMPLETED').length;
  const hasRating = profile && profile.ratingCount > 0;

  let subtitle = 'Ready to help someone today?';
  if (active) subtitle = 'You have a job in progress.';
  else if (open.length) subtitle = `${open.length} new request${open.length === 1 ? '' : 's'} waiting for you.`;
  else if (profile && !profile.available) subtitle = "You're hidden — turn on availability to get requests.";

  return (
    <div className="ui-page">
      <PageHeader title="Buddy dashboard" hideBack />
      <div className="ui-container">
        {loading ? (
          <PageLoader label="Loading your dashboard…" />
        ) : error ? (
          <Banner type="error">
            {error}{' '}
            <button type="button" className="ui-btn ui-btn-sm" onClick={() => load(false)}>
              Retry
            </button>
          </Banner>
        ) : (
          <>
            <div className="ui-hero">
              <h2>Hello, {firstName} 👋</h2>
              <p>{subtitle}</p>
              {profile?.verificationStatus === 'APPROVED' && (
                <span className="ui-chip ok bd-hero-chip">✔️ Verified</span>
              )}
            </div>

            {noProfile && (
              <Banner type="warn">
                Your buddy profile isn't set up yet. Elders can't find you until it's complete.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/buddy-info')}>
                    Complete your profile
                  </button>
                </div>
              </Banner>
            )}
            {profile?.verificationStatus === 'PENDING' && (
              <Banner type="info" icon="⏳">
                Your profile is being reviewed. You can start taking requests once approved.
              </Banner>
            )}
            {profile?.verificationStatus === 'REJECTED' && (
              <Banner type="error">
                Your verification was not approved.
                {profile.verificationNote ? ` Note: ${profile.verificationNote}` : ''}{' '}
                <Link to="/buddy-info" className="ui-strong">Update profile</Link>
              </Banner>
            )}

            {profile && (
              <div className="ui-card">
                <div className="ui-row ui-between">
                  <div className="ui-grow">
                    <h3 className="ui-card-title" style={{ margin: 0 }}>
                      {profile.available ? '🟢 You\'re available' : '🟠 You\'re hidden'}
                    </h3>
                    <div className="ui-small ui-muted" style={{ fontSize: 13 }}>
                      Turn on to appear in elders' search results.
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!profile.available}
                    aria-label="Availability"
                    className={`ui-switch ${profile.available ? 'on' : ''}`}
                    onClick={toggleAvailable}
                    disabled={toggleBusy}
                  />
                </div>
                <hr className="ui-divider" />
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-block"
                  style={{ minHeight: 48 }}
                  onClick={updateLocation}
                  disabled={locBusy}
                >
                  {locBusy ? <Spinner /> : '📍'} Update my base location
                </button>
                <div className="ui-hint">This is how elders nearby find you. Update it when you move.</div>
              </div>
            )}

            <div className="ui-grid-3" style={{ marginBottom: 14 }}>
              <div className="ui-card ui-stat" style={{ marginBottom: 0 }}>
                <div className="ui-stat-value">{hasRating ? `⭐ ${Number(profile.ratingAverage).toFixed(1)}` : '—'}</div>
                <div className="ui-stat-label">Rating</div>
              </div>
              <div className="ui-card ui-stat" style={{ marginBottom: 0 }}>
                <div className="ui-stat-value">{completed}</div>
                <div className="ui-stat-label">Jobs done</div>
              </div>
              <div
                className="ui-card ui-stat ui-clickable"
                style={{ marginBottom: 0 }}
                onClick={() => navigate('/wallet')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/wallet')}
              >
                <div className="ui-stat-value">{formatMoney(wallet?.balance)}</div>
                <div className="ui-stat-label">Wallet</div>
              </div>
            </div>

            {active && (
              <>
                <div className="ui-section-title">Current job</div>
                <div className="ui-card">
                  <div className="ui-row ui-between">
                    <span className="ui-strong" style={{ fontSize: 16 }}>{active.elderName}</span>
                    <StatusChip status={active.status} />
                  </div>
                  {active.serviceNotes && (
                    <p className="ui-muted" style={{ margin: '8px 0 0', fontSize: 14 }}>
                      “{active.serviceNotes.length > 90 ? `${active.serviceNotes.slice(0, 90)}…` : active.serviceNotes}”
                    </p>
                  )}
                  {(active.addressLine || active.city) && (
                    <div className="ui-small ui-muted" style={{ marginTop: 8, fontSize: 13 }}>
                      📍 {[active.addressLine, active.city].filter(Boolean).join(', ')}
                    </div>
                  )}
                  <div className="ui-btn-group" style={{ marginTop: 12 }}>
                    <button type="button" className="ui-btn ui-btn-primary" style={{ minHeight: 44 }} onClick={() => navigate(`/bookings/${active.id}`)}>
                      Open
                    </button>
                    <button type="button" className="ui-btn ui-btn-secondary" style={{ minHeight: 44 }} onClick={() => navigate(`/bookings/${active.id}/chat`)}>
                      💬 Chat
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="ui-section-title">
              <span>New requests near you</span>
              <Link to="/bookings?tab=open" className="ui-small" style={{ color: '#667eea', textTransform: 'none' }}>
                See all
              </Link>
            </div>
            {open.length === 0 ? (
              <EmptyState icon="📭" title="No open requests right now" text="We'll let you know as soon as one comes in." />
            ) : (
              open.map((b) => (
                <div key={b.id} className="ui-card">
                  <div className="ui-row ui-between">
                    <span className="ui-strong">{b.elderName}</span>
                    <span className="ui-small ui-muted">{timeAgo(b.createdAt)}</span>
                  </div>
                  {b.serviceNotes && (
                    <p className="ui-muted" style={{ margin: '6px 0 0', fontSize: 14 }}>
                      {b.serviceNotes.length > 90 ? `${b.serviceNotes.slice(0, 90)}…` : b.serviceNotes}
                    </p>
                  )}
                  {b.city && <div className="ui-small ui-muted" style={{ marginTop: 6, fontSize: 13 }}>📍 {b.city}</div>}
                  <div className="ui-btn-group" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="ui-btn ui-btn-success"
                      style={{ minHeight: 44 }}
                      disabled={actingId === b.id}
                      onClick={() => act(b.id, 'accept')}
                    >
                      {actingId === b.id ? <Spinner /> : '✔️'} Accept
                    </button>
                    <button
                      type="button"
                      className="ui-btn"
                      style={{ minHeight: 44 }}
                      disabled={actingId === b.id}
                      onClick={() => act(b.id, 'reject')}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
            {loading && <ListSkeleton rows={2} />}
          </>
        )}
      </div>
      <BottomNavBar />
    </div>
  );
}
