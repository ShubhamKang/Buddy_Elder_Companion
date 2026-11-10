import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import BottomNavBar from '../components/BottomNavBar';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import ConfirmModal from '../components/ui/ConfirmModal';
import LiveTracking from '../components/LiveTracking';
import { Banner, EmptyState, PageLoader, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { bookingsApi, paymentsApi, reviewsApi } from '../api/endpoints';
import { profilesApi } from '../api/profiles';
import { errorMessage, formatDateTime, formatMoney, newIdempotencyKey } from '../utils/format';
import './Bookings.css';

const TERMINAL = ['COMPLETED', 'CANCELLED', 'REJECTED'];
const STEPS = [
  ['REQUESTED', 'Requested'],
  ['ACCEPTED', 'Accepted'],
  ['IN_PROGRESS', 'In progress'],
  ['COMPLETED', 'Completed'],
];

const notify = () => window.dispatchEvent(new Event('notifications:changed'));

export default function BookingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const role = user?.role;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');

  // payment
  const [payment, setPayment] = useState(null);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');
  const [amount, setAmount] = useState('500');
  const [paying, setPaying] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const idemKey = useRef(newIdempotencyKey());

  // review
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [reviewDone, setReviewDone] = useState(null); // {rating} | {already:true}

  const status = booking?.status;
  const buddyId = booking?.buddyId;
  const isElder = role === 'ELDER';

  // If this session was already reviewed, show that review instead of an empty form.
  useEffect(() => {
    if (!isElder || status !== 'COMPLETED') return undefined;
    let active = true;
    reviewsApi
      .get(id)
      .then((r) => {
        if (active) setReviewDone({ rating: r.rating, comment: r.comment });
      })
      .catch(() => { /* 404 = not reviewed yet */ });
    return () => {
      active = false;
    };
  }, [id, isElder, status]);
  const isBuddy = role === 'BUDDY';

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const b = await bookingsApi.get(id);
        setBooking(b);
        setNotFound(false);
        setError('');
      } catch (err) {
        if (err?.response?.status === 404) setNotFound(true);
        else if (!silent) setError(errorMessage(err, 'Could not load this booking.'));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [id]
  );

  useEffect(() => {
    load(false);
  }, [load]);

  // Poll while not terminal
  useEffect(() => {
    if (notFound || (status && TERMINAL.includes(status))) return undefined;
    if (!status) return undefined;
    const t = setInterval(() => load(true), 8000);
    return () => clearInterval(t);
  }, [status, notFound, load]);

  // Payment info
  const loadPayment = useCallback(async () => {
    setPayLoading(true);
    setPayError('');
    try {
      setPayment(await paymentsApi.get(id));
    } catch (err) {
      if (err?.response?.status === 404) setPayment(null);
      else setPayError(errorMessage(err, 'Could not load payment details.'));
    } finally {
      setPayLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!isElder || !buddyId) return undefined;
    loadPayment();
    let active = true;
    profilesApi
      .getBuddy(buddyId)
      .then((p) => {
        if (active && p?.hourlyRate) setAmount(String(p.hourlyRate));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isElder, buddyId, loadPayment]);

  const run = async (fn, okMsg) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast(okMsg, 'success');
      notify();
      await load(true);
    } catch (err) {
      toast(errorMessage(err, 'Action failed.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    await run(() => bookingsApi.cancel(id, reason.trim() || undefined), 'Booking cancelled.');
    setCancelOpen(false);
    setReason('');
  };

  const pay = async () => {
    const n = Number(amount);
    if (!n || n <= 0) return toast('Enter a valid amount.', 'error');
    if (paying) return;
    setPaying(true);
    try {
      setPayment(await paymentsApi.charge(id, n, idemKey.current));
      toast('Payment successful.', 'success');
      notify();
    } catch (err) {
      toast(errorMessage(err, 'Payment failed.'), 'error');
    } finally {
      setPaying(false);
    }
  };

  const refund = async () => {
    setRefunding(true);
    try {
      setPayment(await paymentsApi.refund(id));
      toast('Refund issued.', 'success');
      notify();
      setRefundOpen(false);
    } catch (err) {
      toast(errorMessage(err, 'Refund failed.'), 'error');
    } finally {
      setRefunding(false);
    }
  };

  const submitReview = async () => {
    if (!rating) return toast('Please tap a star rating first.', 'info');
    setReviewing(true);
    try {
      await reviewsApi.create(id, { rating, comment: comment.trim() || undefined });
      setReviewDone({ rating });
      toast('Thanks for your review!', 'success');
    } catch (err) {
      if (err?.response?.status === 409) setReviewDone({ already: true });
      else toast(errorMessage(err, 'Could not submit review.'), 'error');
    } finally {
      setReviewing(false);
    }
  };

  const back = <PageHeader title="Booking" backTo="/bookings" />;

  if (loading) {
    return (
      <div className="ui-page">
        {back}
        <div className="ui-container"><PageLoader label="Loading booking…" /></div>
        <BottomNavBar />
      </div>
    );
  }

  if (notFound || (!booking && !error)) {
    return (
      <div className="ui-page">
        {back}
        <div className="ui-container">
          <EmptyState
            icon="🔍"
            title="Booking not found"
            text="It may have been removed or you may not have access to it."
            action={<button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/bookings')}>Back to bookings</button>}
          />
        </div>
        <BottomNavBar />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="ui-page">
        {back}
        <div className="ui-container">
          <Banner type="error">
            {error} <button type="button" className="ui-btn ui-btn-sm" onClick={() => load(false)}>Retry</button>
          </Banner>
        </div>
        <BottomNavBar />
      </div>
    );
  }

  const b = booking;
  const failed = b.status === 'CANCELLED' || b.status === 'REJECTED';
  const stepIdx = STEPS.findIndex(([k]) => k === b.status);
  const stepTime = { REQUESTED: b.createdAt, IN_PROGRESS: b.startedAt, COMPLETED: b.completedAt };
  const other = isBuddy ? b.elderName : b.buddyName;
  const hasLoc = b.latitude != null && b.longitude != null;
  const address = [b.addressLine, b.city].filter(Boolean).join(', ');
  const live = b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS';
  const elderCanCancel = isElder && ACTIVE_STATUSES(b.status);
  const buddyOpen = isBuddy && b.status === 'REQUESTED' && !b.buddyId;
  const showActions = elderCanCancel || buddyOpen || (isBuddy && (b.status === 'ACCEPTED' || b.status === 'IN_PROGRESS'));
  const refunded = payment?.status === 'REFUNDED';

  return (
    <div className="ui-page">
      <PageHeader title="Booking details" subtitle={`Ref #${String(b.id).slice(0, 8).toUpperCase()}`} backTo="/bookings" right={<StatusChip status={b.status} />} />
      <div className="ui-container ui-stack">
        {error ? <Banner type="error">{error}</Banner> : null}

        <div className="ui-card">
          <div className="ui-card-title">📍 Status</div>
          {failed ? (
            <Banner type="error" icon={b.status === 'CANCELLED' ? '🚫' : '❌'}>
              <strong>{b.status === 'CANCELLED' ? 'This booking was cancelled.' : 'This request was declined.'}</strong>
              {b.cancelReason ? <div>Reason: {b.cancelReason}</div> : null}
            </Banner>
          ) : (
            <ul className="ui-timeline">
              {STEPS.map(([k, label], i) => {
                const cls = i < stepIdx || b.status === 'COMPLETED' ? 'done' : i === stepIdx ? 'current' : '';
                return (
                  <li key={k} className={cls}>
                    <span className="dot">{cls === 'done' ? '✓' : ''}</span>
                    <strong>{label}</strong>
                    {stepTime[k] && cls ? <span className="when">{formatDateTime(stepTime[k])}</span> : null}
                  </li>
                );
              })}
            </ul>
          )}

          {showActions ? (
            <>
              <div className="ui-divider" />
              <div className="ui-btn-group">
                {elderCanCancel ? (
                  <button type="button" className="ui-btn ui-btn-danger ui-btn-block" disabled={busy} onClick={() => setCancelOpen(true)}>Cancel booking</button>
                ) : null}
                {buddyOpen ? (
                  <>
                    <button type="button" className="ui-btn ui-btn-success" disabled={busy} onClick={() => run(() => bookingsApi.accept(id), 'Job accepted!')}>{busy ? <Spinner /> : 'Accept'}</button>
                    <button type="button" className="ui-btn" disabled={busy} onClick={() => run(() => bookingsApi.reject(id), 'Request declined.')}>Decline</button>
                  </>
                ) : null}
                {isBuddy && b.status === 'ACCEPTED' ? (
                  <button type="button" className="ui-btn ui-btn-primary ui-btn-block" disabled={busy} onClick={() => run(() => bookingsApi.start(id), 'Session started.')}>{busy ? <Spinner /> : '▶️ Start session'}</button>
                ) : null}
                {isBuddy && b.status === 'IN_PROGRESS' ? (
                  <button type="button" className="ui-btn ui-btn-success ui-btn-block" disabled={busy} onClick={() => run(() => bookingsApi.complete(id), 'Session completed. Great work!')}>{busy ? <Spinner /> : '✅ Mark completed'}</button>
                ) : null}
              </div>
            </>
          ) : null}
        </div>

        {b.buddyId || isBuddy ? (
          <div className="ui-card">
            <div className="ui-card-title">{isBuddy ? '👵 Elder' : '🧑‍⚕️ Your buddy'}</div>
            <div className="ui-row">
              <Avatar name={other || '?'} size="lg" />
              <div className="ui-col ui-grow">
                <div className="ui-strong">{other || 'Unknown'}</div>
                <div className="ui-small ui-muted">{isBuddy ? 'Elder' : 'Buddy'}</div>
              </div>
            </div>
            <div className="ui-btn-group" style={{ marginTop: 12 }}>
              {b.buddyId ? (
                <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate(`/bookings/${b.id}/chat`)}>💬 Chat</button>
              ) : null}
              {isElder && b.buddyId ? (
                <button type="button" className="ui-btn" onClick={() => navigate(`/buddy/${b.buddyId}`)}>View profile</button>
              ) : null}
            </div>
          </div>
        ) : (
          <Banner type="info" icon="🕒">Finding a buddy… we'll let you know as soon as someone accepts.</Banner>
        )}

        {live ? <LiveTracking booking={b} role={role} /> : null}

        <div className="ui-card">
          <div className="ui-card-title">📋 Details</div>
          <div className="ui-stack">
            <div><span className="bk-tag">{b.type === 'SCHEDULED' ? '📅 Scheduled' : '⚡ Instant'}</span></div>
            <div>
              <div className="ui-small ui-muted">{b.type === 'SCHEDULED' ? 'Scheduled for' : 'Requested at'}</div>
              <div className="ui-strong">{formatDateTime(b.type === 'SCHEDULED' && b.scheduledAt ? b.scheduledAt : b.createdAt)}</div>
            </div>
            {address ? (
              <div>
                <div className="ui-small ui-muted">Address</div>
                <div className="ui-strong">{address}</div>
                {hasLoc ? (
                  <a className="bk-link" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${b.latitude}&mlon=${b.longitude}#map=17/${b.latitude}/${b.longitude}`}>🗺️ Open in maps</a>
                ) : null}
              </div>
            ) : null}
            <div>
              <div className="ui-small ui-muted">Notes</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{b.serviceNotes || 'No notes added.'}</div>
            </div>
          </div>
        </div>

        {isElder && b.buddyId ? (
          <div className="ui-card">
            <div className="ui-card-title">💳 Payment</div>
            {payLoading ? <PageLoader label="Checking payment…" /> : null}
            {!payLoading && payError ? (
              <Banner type="error">{payError} <button type="button" className="ui-btn ui-btn-sm" onClick={loadPayment}>Retry</button></Banner>
            ) : null}
            {!payLoading && !payError && !payment ? (
              <div className="ui-stack">
                <div className="ui-field">
                  <label className="ui-label" htmlFor="bk-amount">Amount (₹)</label>
                  <input id="bk-amount" type="number" min="1" step="1" inputMode="decimal" className="ui-input" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <div className="ui-hint">Sandbox payment - no real money is charged</div>
                </div>
                <button type="button" className="ui-btn ui-btn-primary ui-btn-block" disabled={paying} onClick={pay}>{paying ? <Spinner /> : '🔒 Pay securely'}</button>
              </div>
            ) : null}
            {!payLoading && !payError && payment ? (
              <div className="ui-stack">
                <div className="ui-row ui-between">
                  <span className="ui-strong" style={{ fontSize: 20 }}>{formatMoney(payment.amount)}</span>
                  <StatusChip status={payment.status} />
                </div>
                {payment.providerRef ? <div className="ui-small ui-muted">Reference: {payment.providerRef}</div> : null}
                {refunded ? <div className="ui-small ui-muted">This payment has been refunded.</div> : null}
                {payment.status === 'CAPTURED' && b.status !== 'COMPLETED' ? (
                  <button type="button" className="ui-btn ui-btn-danger" onClick={() => setRefundOpen(true)}>Request refund</button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {isElder && b.status === 'COMPLETED' ? (
          <div className="ui-card">
            <div className="ui-card-title">⭐ Rate your buddy</div>
            {reviewDone?.already ? (
              <Banner type="ok" icon="💜">Thanks, you've already reviewed this session.</Banner>
            ) : (
              <>
                <div className="bk-stars" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} className={`bk-star ${n <= (reviewDone?.rating || rating) ? 'on' : ''}`} disabled={!!reviewDone || reviewing} onClick={() => setRating(n)}>⭐</button>
                  ))}
                </div>
                {reviewDone ? (
                  <>
                    {reviewDone.comment ? <p className="ui-muted" style={{ margin: '4px 0 12px', fontStyle: 'italic' }}>“{reviewDone.comment}”</p> : null}
                    <Banner type="ok">Thanks for your review!</Banner>
                  </>
                ) : (
                  <>
                    <textarea className="ui-textarea" rows={3} maxLength={500} placeholder="Tell us how it went (optional)" aria-label="Review comment" value={comment} onChange={(e) => setComment(e.target.value)} />
                    <button type="button" className="ui-btn ui-btn-primary ui-btn-block" style={{ marginTop: 12 }} disabled={reviewing} onClick={submitReview}>{reviewing ? <Spinner /> : 'Submit review'}</button>
                  </>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      <ConfirmModal
        open={cancelOpen}
        danger
        busy={busy}
        title="Cancel this booking?"
        text="Your buddy will be notified."
        confirmLabel={busy ? 'Cancelling…' : 'Yes, cancel'}
        cancelLabel="Keep booking"
        onConfirm={confirmCancel}
        onCancel={() => !busy && setCancelOpen(false)}
      >
        <textarea className="ui-textarea" rows={3} maxLength={300} placeholder="Reason (optional)" aria-label="Cancellation reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      </ConfirmModal>

      <ConfirmModal
        open={refundOpen}
        busy={refunding}
        title="Request a refund?"
        text="The amount will be returned to you."
        confirmLabel={refunding ? 'Refunding…' : 'Request refund'}
        onConfirm={refund}
        onCancel={() => !refunding && setRefundOpen(false)}
      />
      <BottomNavBar />
    </div>
  );
}

function ACTIVE_STATUSES(s) {
  return s === 'REQUESTED' || s === 'ACCEPTED' || s === 'IN_PROGRESS';
}
