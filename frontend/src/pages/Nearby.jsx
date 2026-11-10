import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import Avatar from '../components/ui/Avatar';
import { Banner, EmptyState, ListSkeleton, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { geoApi } from '../api/endpoints';
import { profilesApi } from '../api/profiles';
import { errorMessage, getCurrentPosition, getSavedLocation, formatMoney } from '../utils/format';
import './Nearby.css';

const RADII = [2, 5, 10, 25, 50];
const SORTS = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'rating', label: 'Top rated' },
  { key: 'price', label: 'Lowest price' },
];

const splitSkills = (s) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

const hasCoords = (loc) => !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

export default function Nearby() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const [loc, setLoc] = useState(() => getSavedLocation());
  const [locBusy, setLocBusy] = useState(false);
  const [radius, setRadius] = useState(10);
  const [sort, setSort] = useState('nearest');
  const [query, setQuery] = useState(params.get('q') || '');
  const [browseAll, setBrowseAll] = useState(false);
  const [buddies, setBuddies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const coords = hasCoords(loc);
  const useFallback = !coords || browseAll;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    const run = useFallback
      ? profilesApi.listAvailableBuddies({ size: 50 }).then((p) => p?.content || [])
      : geoApi.nearby(loc.lat, loc.lng, radius, 50).then((l) => (Array.isArray(l) ? l : l?.content || []));
    run
      .then((list) => active && setBuddies(list))
      .catch((e) => active && setError(errorMessage(e, 'Could not load buddies.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useFallback, loc?.lat, loc?.lng, radius, reloadKey]);

  const useMyLocation = async () => {
    setLocBusy(true);
    try {
      const pos = await getCurrentPosition();
      setLoc({ ...(loc || {}), lat: pos.lat, lng: pos.lng, name: 'your location' });
      setBrowseAll(false);
      toast('Location found', 'success');
    } catch (e) {
      toast(e.message || 'Could not get your location', 'error');
    } finally {
      setLocBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = buddies.filter(
      (b) =>
        !q ||
        `${b.fullName || ''} ${b.skills || ''} ${b.bio || ''}`.toLowerCase().includes(q)
    );
    list = [...list];
    if (sort === 'rating') {
      list.sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
    } else if (sort === 'price') {
      list.sort((a, b) => (a.hourlyRate ?? Infinity) - (b.hourlyRate ?? Infinity));
    } else {
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }
    return list;
  }, [buddies, query, sort]);

  const area = loc && (loc.name || loc.area || loc.city);

  return (
    <div className="ui-page">
      <PageHeader title="Find a buddy" subtitle="Caring helpers close to you" backTo="/home" />
      <div className="ui-container">
        {!coords ? (
          <div className="ui-card">
            <h3 className="ui-card-title">📍 Where are you?</h3>
            <p className="ui-muted" style={{ marginTop: 0 }}>
              Share your location to see buddies closest to you.
            </p>
            <div className="ui-btn-group">
              <button type="button" className="ui-btn ui-btn-primary" onClick={useMyLocation} disabled={locBusy}>
                {locBusy ? <Spinner /> : '🎯'} Use my current location
              </button>
              <Link to="/addresses?mode=location" className="ui-btn ui-btn-secondary">
                Change location
              </Link>
            </div>
          </div>
        ) : (
          <div className="ui-row ui-between ui-wrap" style={{ marginBottom: 10 }}>
            <span className="nb-pill">📍 near {area || 'you'}</span>
            <Link to="/addresses?mode=location" className="ui-small ui-strong" style={{ color: '#667eea' }}>
              Change
            </Link>
          </div>
        )}

        {!coords && (
          <Banner type="info">
            We don't have your location yet, so we're showing all available buddies without distance.
          </Banner>
        )}

        {coords && !browseAll && (
          <>
            <div className="nb-label">Distance</div>
            <div className="ui-tabs" role="tablist">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={`ui-tab ${radius === r ? 'active' : ''}`}
                  onClick={() => setRadius(r)}
                  style={{ minHeight: 44 }}
                >
                  {r} km
                </button>
              ))}
            </div>
          </>
        )}
        {coords && browseAll && (
          <Banner type="info">
            Showing all available buddies.{' '}
            <button type="button" className="ui-btn ui-btn-sm ui-btn-secondary" onClick={() => setBrowseAll(false)}>
              Back to nearby
            </button>
          </Banner>
        )}

        <div className="nb-label">Sort by</div>
        <div className="ui-tabs">
          {SORTS.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`ui-tab ${sort === s.key ? 'active' : ''}`}
              onClick={() => setSort(s.key)}
              style={{ minHeight: 44 }}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ui-field">
          <input
            className="ui-input"
            type="search"
            placeholder="🔍 Search by name or skill (e.g. cooking)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search buddies"
            style={{ minHeight: 48 }}
          />
        </div>

        {loading ? (
          <ListSkeleton rows={4} height={130} />
        ) : error ? (
          <Banner type="error">
            {error}{' '}
            <button type="button" className="ui-btn ui-btn-sm" onClick={() => setReloadKey((k) => k + 1)}>
              Retry
            </button>
          </Banner>
        ) : visible.length === 0 ? (
          query.trim() ? (
            <EmptyState
              icon="🔎"
              title="No matches"
              text={`No buddies match “${query}”.`}
              action={
                <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setQuery('')}>
                  Clear search
                </button>
              }
            />
          ) : (
            <EmptyState
              icon="🧭"
              title={useFallback ? 'No buddies available right now' : `No buddies within ${radius} km`}
              text={useFallback ? 'Please check again in a little while.' : 'Try a wider area or browse everyone available.'}
              action={
                !useFallback ? (
                  <div className="ui-btn-group">
                    {radius < 25 && (
                      <button type="button" className="ui-btn ui-btn-primary" onClick={() => setRadius(25)}>
                        Widen to 25 km
                      </button>
                    )}
                    <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setBrowseAll(true)}>
                      Browse all available
                    </button>
                  </div>
                ) : (
                  <button type="button" className="ui-btn ui-btn-secondary" onClick={() => setReloadKey((k) => k + 1)}>
                    Refresh
                  </button>
                )
              }
            />
          )
        ) : (
          visible.map((b) => {
            const skills = splitSkills(b.skills);
            return (
              <div
                key={b.userId}
                className="ui-card ui-clickable"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/buddy/${b.userId}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/buddy/${b.userId}`)}
              >
                <div className="ui-row">
                  <Avatar name={b.fullName} />
                  <div className="ui-grow">
                    <div className="ui-row ui-wrap" style={{ gap: 8 }}>
                      <span className="ui-strong" style={{ fontSize: 16 }}>{b.fullName}</span>
                      {b.verificationStatus === 'APPROVED' && <span className="ui-chip ok">✔️ Verified</span>}
                    </div>
                    <div className="ui-small ui-muted" style={{ fontSize: 13 }}>
                      {b.ratingCount > 0
                        ? `⭐ ${Number(b.ratingAverage || 0).toFixed(1)} (${b.ratingCount})`
                        : '🌱 New'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ui-btn ui-btn-secondary"
                    style={{ minHeight: 44 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/book?buddy=${b.userId}&name=${encodeURIComponent(b.fullName || '')}`);
                    }}
                  >
                    Book
                  </button>
                </div>
                {skills.length > 0 && (
                  <div className="nb-skills">
                    {skills.slice(0, 3).map((s) => (
                      <span key={s} className="nb-skill">{s}</span>
                    ))}
                    {skills.length > 3 && <span className="nb-skill">+{skills.length - 3}</span>}
                  </div>
                )}
                <div className="nb-stats">
                  {typeof b.distanceKm === 'number' && <span>📍 {b.distanceKm.toFixed(1)} km</span>}
                  <span>💼 {b.yearsExperience ?? 0} yrs</span>
                  <span>{b.hourlyRate != null ? `${formatMoney(b.hourlyRate)}/hr` : 'Rate on request'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
      <BottomNavBar />
    </div>
  );
}
