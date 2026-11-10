import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import BottomNavBar from '../components/BottomNavBar';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import { Banner, EmptyState, ListSkeleton, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { bookingsApi } from '../api/endpoints';
import { errorMessage, formatDateTime } from '../utils/format';
import './Bookings.css';

const ACTIVE = ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'];
const PAGE = 100;

export default function Bookings() {
  const { user } = useAuth();
  const isBuddy = user?.role === 'BUDDY';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [sp, setSp] = useSearchParams();

  const tab = isBuddy ? (sp.get('tab') === 'open' ? 'open' : 'jobs') : sp.get('tab') || 'active';
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [moreBusy, setMoreBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const pageRef = useRef(0);

  const source = isBuddy ? (tab === 'open' ? 'open' : 'mine') : 'mine';

  const fetchPage = useCallback(
    (p) => {
      const params = { page: p, size: PAGE, sort: 'createdAt,desc' };
      if (!isBuddy) return bookingsApi.mineElder(params);
      return source === 'open' ? bookingsApi.open(params) : bookingsApi.mineBuddy(params);
    },
    [isBuddy, source]
  );

  // Reload first page(s). silent => no skeleton flicker.
  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const res = await fetchPage(0);
        setItems(res?.content || []);
        setLast(res?.last !== false);
        setPage(0);
        pageRef.current = 0;
        setError('');
      } catch (err) {
        if (!silent) setError(errorMessage(err, 'Could not load bookings.'));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    if (!user) return undefined;
    setItems([]);
    load(false);
    const t = setInterval(() => {
      // only auto-refresh when first page is what's shown
      if (pageRef.current === 0) load(true);
    }, 15000);
    return () => clearInterval(t);
  }, [load, user]);

  const loadMore = async () => {
    setMoreBusy(true);
    try {
      const res = await fetchPage(page + 1);
      setItems((prev) => [...prev, ...(res?.content || [])]);
      setLast(res?.last !== false);
      setPage(page + 1);
      pageRef.current = page + 1;
    } catch (err) {
      toast(errorMessage(err, 'Could not load more.'), 'error');
    } finally {
      setMoreBusy(false);
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  };

  const act = async (e, b, kind) => {
    e.stopPropagation();
    if (busyId) return;
    setBusyId(b.id);
    try {
      if (kind === 'accept') await bookingsApi.accept(b.id);
      else await bookingsApi.reject(b.id);
      toast(kind === 'accept' ? 'Job accepted! It is now in My jobs.' : 'Request declined.', 'success');
      window.dispatchEvent(new Event('notifications:changed'));
      await load(true);
    } catch (err) {
      toast(errorMessage(err, 'Action failed.'), 'error');
    } finally {
      setBusyId(null);
    }
  };

  const setTab = (t) => {
    if (isBuddy) setSp(t === 'open' ? { tab: 'open' } : {}, { replace: true });
    else setSp(t === 'active' ? {} : { tab: t }, { replace: true });
  };

  const tabs = isBuddy
    ? [['jobs', 'My jobs'], ['open', 'Open requests']]
    : [['active', 'Active'], ['past', 'Past'], ['all', 'All']];

  let visible = items;
  if (!isBuddy && tab === 'active') visible = items.filter((b) => ACTIVE.includes(b.status));
  if (!isBuddy && tab === 'past') visible = items.filter((b) => !ACTIVE.includes(b.status));

  const newBtn = !isBuddy ? (
    <button type="button" className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => navigate('/book')}>➕ New booking</button>
  ) : null;

  const emptyText = isBuddy
    ? tab === 'open' ? 'No open requests nearby right now. Check back soon.' : 'Accept an open request to see your jobs here.'
    : tab === 'past' ? 'Completed and cancelled bookings will show up here.' : 'Need help with something? Book a buddy in a minute.';

  return (
    <div className="ui-page">
      <PageHeader title="Bookings" subtitle={isBuddy ? 'Your jobs and requests' : 'Your care requests'} right={newBtn} />
      <div className="ui-container">
        <div className="ui-row ui-between">
          <div className="ui-tabs ui-grow" role="tablist">
            {tabs.map(([k, label]) => (
              <button type="button" role="tab" aria-selected={tab === k} key={k} className={`ui-tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{label}</button>
            ))}
          </div>
          <button type="button" className="ui-btn ui-btn-ghost" onClick={manualRefresh} disabled={refreshing || loading} aria-label="Refresh">
            {refreshing ? <Spinner /> : '🔄'}
          </button>
        </div>

        {loading ? <ListSkeleton rows={4} /> : null}

        {!loading && error ? (
          <Banner type="error">
            {error}{' '}
            <button type="button" className="ui-btn ui-btn-sm" onClick={() => load(false)}>Retry</button>
          </Banner>
        ) : null}

        {!loading && !error && visible.length === 0 ? (
          <EmptyState
            icon={isBuddy ? '🧑‍🤝‍🧑' : '📋'}
            title={isBuddy ? 'Nothing here yet' : 'No bookings yet'}
            text={emptyText}
            action={
              isBuddy ? (
                tab !== 'open' ? <button type="button" className="ui-btn ui-btn-primary" onClick={() => setTab('open')}>See open requests</button> : null
              ) : (
                <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/book')}>➕ New booking</button>
              )
            }
          />
        ) : null}

        {!loading && !error && visible.length > 0 ? (
          <div className="ui-list">
            {visible.map((b) => {
              const other = isBuddy ? b.elderName : b.buddyName;
              const title = (b.serviceNotes || '').split('\n')[0] || 'Care request';
              const when = b.type === 'SCHEDULED' && b.scheduledAt ? b.scheduledAt : b.createdAt;
              const showActions = isBuddy && tab === 'open' && b.status === 'REQUESTED';
              return (
                <div key={b.id} className="ui-item" role="button" tabIndex={0} onClick={() => navigate(`/bookings/${b.id}`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/bookings/${b.id}`)}>
                  {other ? <Avatar name={other} /> : <div className="bk-placeholder" aria-hidden="true">🕒</div>}
                  <div className="ui-col ui-grow" style={{ minWidth: 0 }}>
                    <div className="ui-item-title ui-clip">{title}</div>
                    <div className="ui-item-sub">{other || 'Finding a buddy…'}</div>
                    <div className="ui-item-sub">
                      <span className="bk-tag">{b.type === 'SCHEDULED' ? '📅 Scheduled' : '⚡ Instant'}</span>
                      {formatDateTime(when)}{b.city ? ` · ${b.city}` : ''}
                    </div>
                    {showActions ? (
                      <div className="bk-actions">
                        <button type="button" className="ui-btn ui-btn-success ui-btn-sm" disabled={busyId === b.id} onClick={(e) => act(e, b, 'accept')}>
                          {busyId === b.id ? <Spinner /> : 'Accept'}
                        </button>
                        <button type="button" className="ui-btn ui-btn-sm" disabled={busyId === b.id} onClick={(e) => act(e, b, 'reject')}>Decline</button>
                      </div>
                    ) : null}
                  </div>
                  <StatusChip status={b.status} />
                </div>
              );
            })}
          </div>
        ) : null}

        {!loading && !last ? (
          <button type="button" className="ui-btn ui-btn-block" style={{ marginTop: 14 }} onClick={loadMore} disabled={moreBusy}>
            {moreBusy ? <Spinner /> : 'Load more'}
          </button>
        ) : null}
      </div>
      <BottomNavBar />
    </div>
  );
}
