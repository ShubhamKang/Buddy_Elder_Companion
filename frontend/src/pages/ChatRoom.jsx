import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatusChip from '../components/ui/StatusChip';
import Avatar from '../components/ui/Avatar';
import { Banner, EmptyState, PageLoader, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { useBookingChannel } from '../hooks/useBookingChannel';
import { bookingsApi, chatApi } from '../api/endpoints';
import { errorMessage, formatDate, formatTime } from '../utils/format';
import './ChatRoom.css';

const QUICK = {
  BUDDY: ['On my way 🚗', 'I have arrived 📍', 'Running 10 min late ⏳', 'Session finished ✅'],
  ELDER: ['Thank you 🙏', 'Please call me', 'I am at home 🏠'],
};

const dayKey = (iso) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
};

const dayLabel = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const yest = new Date();
  yest.setDate(now.getDate() - 1);
  if (dayKey(iso) === dayKey(now.toISOString())) return 'Today';
  if (dayKey(iso) === dayKey(yest.toISOString())) return 'Yesterday';
  return formatDate(d.toISOString());
};

export default function ChatRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [booking, setBooking] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [tick, setTick] = useState(0);
  const endRef = useRef(null);

  const addMessage = useCallback((msg) => {
    if (!msg || msg.id == null) return;
    setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
  }, []);

  const { connected, sendChat } = useBookingChannel(id, { onChat: addMessage });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setNotFound(false);
    Promise.all([bookingsApi.get(id), chatApi.history(id, { page: 0, size: 200 })])
      .then(([b, h]) => {
        if (!active) return;
        setBooking(b);
        // merge with any live messages that arrived meanwhile
        setMessages((prev) => {
          const history = h?.content || [];
          const ids = new Set(history.map((m) => m.id));
          return [...history, ...prev.filter((m) => !ids.has(m.id))];
        });
      })
      .catch((err) => {
        if (!active) return;
        if (err?.response?.status === 404) setNotFound(true);
        else setError(errorMessage(err, 'Could not load this conversation.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id, tick]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length, loading]);

  const isBuddy = user?.role === 'BUDDY';
  const other = booking
    ? (isBuddy ? booking.elderName : booking.buddyName) || 'Care partner'
    : 'Chat';

  const send = useCallback(
    async (raw) => {
      const content = (raw || '').trim();
      if (!content || sending) return;
      if (connected && sendChat(content)) {
        setText('');
        return;
      }
      setSending(true);
      try {
        const msg = await chatApi.send(id, content);
        addMessage(msg);
        setText('');
      } catch (err) {
        toast(errorMessage(err, 'Message not sent. Please try again.'), 'error');
      } finally {
        setSending(false);
      }
    },
    [addMessage, connected, id, sendChat, sending, toast]
  );

  const grouped = useMemo(() => {
    const out = [];
    let last = null;
    messages.forEach((m) => {
      const k = dayKey(m.createdAt);
      if (k !== last) {
        out.push({ type: 'day', key: `d-${k}`, label: dayLabel(m.createdAt) });
        last = k;
      }
      out.push({ type: 'msg', key: `m-${m.id}`, msg: m });
    });
    return out;
  }, [messages]);

  const header = (
    <PageHeader
      title={
        booking ? (
          <button
            type="button"
            className="ch-head-link"
            onClick={() => navigate(`/bookings/${id}`)}
            aria-label={`Open booking with ${other}`}
          >
            <Avatar name={other} size="sm" />
            <span className="ui-clip">{other}</span>
          </button>
        ) : (
          'Chat'
        )
      }
      subtitle={booking ? undefined : undefined}
      backTo="/chats"
      right={
        <span className="ch-live" aria-live="polite">
          <span className={`ch-dot ${connected ? 'on' : ''}`} />
          {connected ? 'Live' : 'Connecting…'}
        </span>
      }
    />
  );

  if (loading) {
    return (
      <div className="ui-page">
        {header}
        <PageLoader label="Opening chat…" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="ui-page">
        {header}
        <div className="ui-container">
          <EmptyState
            icon="🔍"
            title="Conversation not found"
            text="This booking doesn't exist or you don't have access to it."
            action={<Link to="/chats" className="ui-btn ui-btn-primary">Back to messages</Link>}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        {header}
        <div className="ui-container">
          <Banner type="error">{error}</Banner>
          <button type="button" className="ui-btn ui-btn-secondary" style={{ marginTop: 10 }} onClick={() => setTick((t) => t + 1)}>
            🔄 Try again
          </button>
        </div>
      </div>
    );
  }

  const quick = QUICK[isBuddy ? 'BUDDY' : 'ELDER'];

  return (
    <div className="ui-page" style={{ paddingBottom: 0 }}>
      {header}
      <div className="ch-body">
        {booking && (
          <div className="ui-row ui-between" style={{ marginBottom: 4 }}>
            <Link to={`/bookings/${id}`} className="ui-small ui-muted" style={{ minHeight: 24 }}>
              View booking details →
            </Link>
            <StatusChip status={booking.status} />
          </div>
        )}
        {grouped.length === 0 ? (
          <div className="ch-hello">
            <div className="big" aria-hidden="true">👋</div>
            <h3 style={{ margin: '8px 0 4px', color: '#111827' }}>Say hello</h3>
            <p style={{ margin: 0 }}>Send a message to {other} to start the conversation.</p>
          </div>
        ) : (
          grouped.map((row) =>
            row.type === 'day' ? (
              <div className="ch-day" key={row.key}><span>{row.label}</span></div>
            ) : (
              <div
                key={row.key}
                className={`ch-msg ${row.msg.senderId === user?.id ? 'mine' : 'theirs'}`}
              >
                <div className="ch-bubble">{row.msg.content}</div>
                <span className="ch-time">{formatTime(row.msg.createdAt)}</span>
              </div>
            )
          )
        )}
        <div ref={endRef} />
      </div>

      <div className="ch-dock">
        <div className="ch-quick">
          {quick.map((q) => (
            <button key={q} type="button" disabled={sending} onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
        <form
          className="ch-composer"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <input
            className="ch-input"
            type="text"
            value={text}
            maxLength={2000}
            placeholder="Type a message…"
            aria-label="Message"
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            className="ch-send"
            aria-label="Send message"
            disabled={!text.trim() || sending}
          >
            {sending ? <Spinner /> : '➤'}
          </button>
        </form>
      </div>
    </div>
  );
}
