import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, Spinner, ListSkeleton, Banner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { notificationsApi } from '../api/endpoints';
import { timeAgo, errorMessage } from '../utils/format';

const PAGE_SIZE = 20;

const emojiFor = (type = '') => {
  if (type.startsWith('BOOKING_')) return '📅';
  if (type.startsWith('SOS_')) return '🚨';
  if (type.startsWith('REMINDER_')) return '⏰';
  if (type === 'CARE_PLAN') return '🗓️';
  if (type === 'VERIFICATION_APPROVED') return '✅';
  if (type === 'VERIFICATION_REJECTED') return '⚠️';
  return '🔔';
};

const routeFor = (type = '') => {
  if (type === 'SOS_ADMIN_ALERT') return '/admin';
  if (type.startsWith('BOOKING_')) return '/bookings';
  if (type.startsWith('SOS_')) return '/sos';
  if (type.startsWith('REMINDER_') || type === 'CARE_PLAN') return '/care';
  if (type.startsWith('VERIFICATION_')) return '/buddy-dashboard';
  return null;
};

const notifyChanged = () => window.dispatchEvent(new Event('notifications:changed'));

export default function Notifications() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);
  const mounted = useRef(true);
  const pageRef = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await notificationsApi.list({ page: 0, size: PAGE_SIZE, sort: 'createdAt,desc' });
      if (!mounted.current) return;
      setItems(res?.content || []);
      setPage(0);
      pageRef.current = 0;
      setLast(res?.last !== false);
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, 'Could not load notifications.'));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // Silent poll: refresh the pages already loaded without flashing a spinner.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const res = await notificationsApi.list({
          page: 0,
          size: Math.max(PAGE_SIZE, (pageRef.current + 1) * PAGE_SIZE),
          sort: 'createdAt,desc',
        });
        if (mounted.current && res?.content) {
          setItems(res.content);
          setLast(res.last !== false);
        }
      } catch (_) {
        /* silent */
      }
    }, 20000);
    return () => clearInterval(id);
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await notificationsApi.list({ page: next, size: PAGE_SIZE, sort: 'createdAt,desc' });
      if (!mounted.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...(res?.content || []).filter((n) => !seen.has(n.id))];
      });
      setPage(next);
      pageRef.current = next;
      setLast(res?.last !== false);
    } catch (err) {
      toast(errorMessage(err, 'Could not load more.'), 'error');
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  };

  const open = async (n) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      try {
        await notificationsApi.markRead(n.id);
        notifyChanged();
      } catch (err) {
        if (mounted.current) {
          setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: false } : x)));
        }
        toast(errorMessage(err, 'Could not mark as read.'), 'error');
      }
    }
    const to = routeFor(n.type);
    if (to) navigate(to);
  };

  const unread = items.filter((n) => !n.read);

  const markAll = async () => {
    setMarkingAll(true);
    const ids = unread.map((n) => n.id);
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    try {
      await Promise.all(ids.map((id) => notificationsApi.markRead(id)));
      toast('All caught up', 'success');
    } catch (err) {
      toast(errorMessage(err, 'Some notifications could not be updated.'), 'error');
      await loadFirst();
    } finally {
      notifyChanged();
      if (mounted.current) setMarkingAll(false);
    }
  };

  const right = unread.length > 0 ? (
    <button type="button" className="ui-btn ui-btn-secondary ui-btn-sm" style={{ minHeight: 44 }} onClick={markAll} disabled={markingAll}>
      {markingAll ? <Spinner /> : null} Mark all read
    </button>
  ) : null;

  const renderBody = () => {
    if (loading) return <ListSkeleton rows={5} />;
    if (error) {
      return (
        <Banner type="error">
          <div>{error}</div>
          <button type="button" className="ui-btn ui-btn-sm" style={{ marginTop: 8 }} onClick={loadFirst}>
            Try again
          </button>
        </Banner>
      );
    }
    if (items.length === 0) {
      return (
        <EmptyState
          icon="🔔"
          title="You're all caught up"
          text="New updates about bookings, reminders and safety will appear here."
          action={
            <button type="button" className="ui-btn ui-btn-primary" onClick={() => navigate('/home')}>
              🏠 Back to home
            </button>
          }
        />
      );
    }
    return (
      <>
        <div className="ui-list">
          {items.map((n) => (
            <div
              key={n.id}
              className={`ui-item ${n.read ? '' : 'unread'}`}
              role="button"
              tabIndex={0}
              style={{ minHeight: 64 }}
              onClick={() => open(n)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(n))}
            >
              <span className="notif-badge" aria-hidden="true">{emojiFor(n.type)}</span>
              <div className="ui-grow">
                <div className="ui-item-title">{n.title}</div>
                {n.body ? <div className="ui-item-sub notif-clamp">{n.body}</div> : null}
                <div className="ui-small ui-muted">{timeAgo(n.createdAt)}</div>
              </div>
            </div>
          ))}
        </div>
        {!last && (
          <button
            type="button"
            className="ui-btn ui-btn-secondary ui-btn-block"
            style={{ marginTop: 16, minHeight: 48 }}
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? <Spinner /> : null} Load more
          </button>
        )}
      </>
    );
  };

  return (
    <div className="ui-page">
      <PageHeader
        title="Notifications"
        subtitle={unread.length ? `${unread.length} unread` : undefined}
        right={right}
      />
      <div className="ui-container">{renderBody()}</div>
      <BottomNavBar />
    </div>
  );
}
