import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import { EmptyState, ListSkeleton, Banner } from '../components/ui/States';
import BottomNavBar from '../components/BottomNavBar';
import { useAuth } from '../auth/AuthContext';
import { bookingsApi } from '../api/endpoints';
import { errorMessage, formatDate } from '../utils/format';

const CHAT_STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'];

export default function Chats() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isBuddy = user?.role === 'BUDDY';
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let active = true;
    setItems(null);
    setError('');
    const params = { page: 0, size: 100, sort: 'createdAt,desc' };
    const call = isBuddy ? bookingsApi.mineBuddy(params) : bookingsApi.mineElder(params);
    call
      .then((res) => {
        if (!active) return;
        const list = (res?.content || []).filter(
          (b) => b.buddyId && CHAT_STATUSES.includes(b.status)
        );
        setItems(list);
      })
      .catch((err) => {
        if (active) setError(errorMessage(err, 'Could not load your conversations.'));
      });
    return () => {
      active = false;
    };
  }, [isBuddy, tick]);

  const retry = useCallback(() => setTick((t) => t + 1), []);

  return (
    <div className="ui-page">
      <PageHeader title="Messages" subtitle="Chat with your care partner" />
      <div className="ui-container">
        {error && (
          <>
            <Banner type="error">{error}</Banner>
            <button type="button" className="ui-btn ui-btn-secondary" style={{ marginTop: 10 }} onClick={retry}>
              🔄 Try again
            </button>
          </>
        )}
        {!error && items === null && <ListSkeleton rows={4} />}
        {!error && items && items.length === 0 && (
          <EmptyState
            icon="💬"
            title="No conversations yet"
            text={
              isBuddy
                ? 'Chats open once you accept a booking.'
                : 'Chats open once a buddy accepts your booking'
            }
            action={
              <button
                type="button"
                className="ui-btn ui-btn-primary ui-btn-lg"
                onClick={() => navigate(isBuddy ? '/bookings?tab=open' : '/book')}
              >
                {isBuddy ? '🔎 Find open requests' : '➕ Book a buddy'}
              </button>
            }
          />
        )}
        {!error && items && items.length > 0 && (
          <div className="ui-list">
            {items.map((b) => {
              const other = (isBuddy ? b.elderName : b.buddyName) || 'Care partner';
              const note = (b.serviceNotes || '').split('\n')[0].trim();
              return (
                <div
                  key={b.id}
                  className="ui-item"
                  role="button"
                  tabIndex={0}
                  style={{ minHeight: 44 }}
                  onClick={() => navigate(`/bookings/${b.id}/chat`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/bookings/${b.id}/chat`);
                    }
                  }}
                >
                  <Avatar name={other} />
                  <div className="ui-grow">
                    <div className="ui-item-title ui-clip">{other}</div>
                    <div className="ui-item-sub ui-clip">
                      {note || 'Care session'} · {formatDate(b.scheduledAt || b.createdAt)}
                    </div>
                  </div>
                  <StatusChip status={b.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <BottomNavBar />
    </div>
  );
}
