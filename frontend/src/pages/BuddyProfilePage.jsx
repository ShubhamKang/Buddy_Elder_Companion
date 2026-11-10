import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import { Banner, EmptyState, PageLoader, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../auth/AuthContext';
import { profilesApi } from '../api/profiles';
import { reviewsApi } from '../api/endpoints';
import { errorMessage, formatDate, formatMoney } from '../utils/format';
import './BuddyProfilePage.css';

const PAGE_SIZE = 20;

const Stars = ({ value }) => (
  <span className="bp-stars" aria-label={`${value} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= value ? '' : 'off'}>{n <= value ? '★' : '☆'}</span>
    ))}
  </span>
);

export default function BuddyProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [buddy, setBuddy] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [moreBusy, setMoreBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    Promise.all([
      profilesApi.getBuddy(id),
      reviewsApi.forBuddy(id, { page: 0, size: PAGE_SIZE, sort: 'createdAt,desc' }).catch(() => null),
    ])
      .then(([b, r]) => {
        if (!active) return;
        setBuddy(b);
        setReviews(r?.content || []);
        setPage(0);
        setLast(r ? r.last !== false : true);
      })
      .catch((e) => {
        if (!active) return;
        if (e?.response?.status === 404) setNotFound(true);
        else setError(errorMessage(e, 'Could not load this profile.'));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, reloadKey]);

  const loadMore = useCallback(async () => {
    setMoreBusy(true);
    try {
      const next = page + 1;
      const r = await reviewsApi.forBuddy(id, { page: next, size: PAGE_SIZE, sort: 'createdAt,desc' });
      setReviews((prev) => [...prev, ...(r?.content || [])]);
      setPage(next);
      setLast(r?.last !== false);
    } catch (e) {
      toast(errorMessage(e, 'Could not load more reviews.'), 'error');
    } finally {
      setMoreBusy(false);
    }
  }, [id, page, toast]);

  const isElder = user?.role === 'ELDER';
  const firstName = (buddy?.fullName || '').trim().split(/\s+/)[0] || 'buddy';
  const skills = (buddy?.skills || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const hasRating = buddy && buddy.ratingCount > 0;

  let body;
  if (loading) {
    body = <PageLoader label="Loading profile…" />;
  } else if (notFound) {
    body = (
      <EmptyState
        icon="🔍"
        title="Buddy not found"
        text="This profile may have been removed."
        action={
          <Link to="/nearby" className="ui-btn ui-btn-primary">
            Find other buddies
          </Link>
        }
      />
    );
  } else if (error) {
    body = (
      <Banner type="error">
        {error}{' '}
        <button type="button" className="ui-btn ui-btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
          Retry
        </button>
      </Banner>
    );
  } else if (buddy) {
    body = (
      <>
        <div className="ui-hero">
          <div className="bp-hero-center">
            <Avatar name={buddy.fullName} size="lg" />
            <h2>{buddy.fullName}</h2>
            <span className={`ui-chip ${buddy.verificationStatus === 'APPROVED' ? 'ok' : 'warn'}`}>
              {buddy.verificationStatus === 'APPROVED' ? '✔️ Verified' : '⏳ Verification pending'}
            </span>
            <p>
              {hasRating
                ? `⭐ ${Number(buddy.ratingAverage || 0).toFixed(1)} · ${buddy.ratingCount} review${buddy.ratingCount === 1 ? '' : 's'}`
                : '🌱 New buddy — no reviews yet'}
            </p>
          </div>
        </div>

        <div className="ui-grid-3" style={{ marginBottom: 14 }}>
          <div className="ui-card ui-stat" style={{ marginBottom: 0 }}>
            <div className="ui-stat-value">{buddy.yearsExperience ?? 0}</div>
            <div className="ui-stat-label">Years experience</div>
          </div>
          <div className="ui-card ui-stat" style={{ marginBottom: 0 }}>
            <div className="ui-stat-value">{buddy.hourlyRate != null ? formatMoney(buddy.hourlyRate) : '—'}</div>
            <div className="ui-stat-label">Per hour</div>
          </div>
          <div className="ui-card ui-stat" style={{ marginBottom: 0 }}>
            <div className="ui-stat-value">{buddy.ratingCount || 0}</div>
            <div className="ui-stat-label">Reviews</div>
          </div>
        </div>

        <div className="ui-card">
          <div className="ui-row ui-between">
            <h3 className="ui-card-title" style={{ margin: 0 }}>About</h3>
            <span className={`ui-chip ${buddy.available ? 'ok' : 'warn'}`}>
              {buddy.available ? '🟢 Available now' : '🟠 Currently busy'}
            </span>
          </div>
          <p className={buddy.bio ? '' : 'ui-muted'} style={{ marginBottom: 0, lineHeight: 1.55, fontSize: 15 }}>
            {buddy.bio || `${firstName} hasn't added a bio yet.`}
          </p>
        </div>

        <div className="ui-card">
          <h3 className="ui-card-title">Skills</h3>
          {skills.length ? (
            <div className="bp-pills" style={{ marginBottom: 0 }}>
              {skills.map((s) => (
                <span key={s} className="bp-skill">{s}</span>
              ))}
            </div>
          ) : (
            <p className="ui-muted" style={{ margin: 0 }}>No skills listed yet.</p>
          )}
        </div>

        <div className="ui-section-title">Reviews</div>
        <div className="ui-card">
          {reviews.length === 0 ? (
            <EmptyState icon="⭐" title="No reviews yet" text={`Be the first to review ${firstName} after a visit.`} />
          ) : (
            <>
              {reviews.map((r) => (
                <div key={r.id} className="bp-review">
                  <div className="ui-row ui-between">
                    <Stars value={r.rating} />
                    <span className="ui-small ui-muted">{formatDate(r.createdAt)}</span>
                  </div>
                  {r.comment ? <p style={{ margin: '6px 0 4px', fontSize: 15 }}>{r.comment}</p> : null}
                  <span className="ui-chip ok">✔️ Verified booking</span>
                </div>
              ))}
              {!last && (
                <button
                  type="button"
                  className="ui-btn ui-btn-secondary ui-btn-block"
                  style={{ marginTop: 12, minHeight: 44 }}
                  onClick={loadMore}
                  disabled={moreBusy}
                >
                  {moreBusy ? <Spinner /> : null} Load more
                </button>
              )}
            </>
          )}
        </div>
      </>
    );
  }

  const showCta = isElder && buddy && !loading && !notFound && !error;

  return (
    <div className="ui-page" style={showCta ? { paddingBottom: 170 } : undefined}>
      <PageHeader title="Buddy profile" backTo="/nearby" />
      <div className="ui-container">{body}</div>
      {showCta && (
        <div className="bp-cta">
          <div className="bp-cta-inner">
            <button
              type="button"
              className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block"
              onClick={() => navigate(`/book?buddy=${id}&name=${encodeURIComponent(buddy.fullName || '')}`)}
            >
              📅 Book {firstName}
            </button>
          </div>
        </div>
      )}
      <BottomNavBar />
    </div>
  );
}
