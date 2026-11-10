import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from '../components/ui/Avatar';
import StatusChip from '../components/ui/StatusChip';
import ConfirmModal from '../components/ui/ConfirmModal';
import { Banner, EmptyState, ListSkeleton, PageLoader, Spinner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../auth/AuthContext';
import { adminApi } from '../api/endpoints';
import { errorMessage, formatDate, formatDateTime } from '../utils/format';
import './Admin.css';

const TABS = [
  { key: 'overview', label: '📊 Overview' },
  { key: 'verifications', label: '🛡️ Verifications' },
  { key: 'users', label: '👥 Users' },
  { key: 'bookings', label: '📅 Bookings' },
  { key: 'audit', label: '📜 Audit log' },
];

const ROLE_CLS = { ELDER: 'info', BUDDY: 'ok', ADMIN: 'warn' };

const humanise = (s = '') =>
  s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());

/** Fetches a paged admin list with "load more". */
function usePagedList(fetcher, size, enabled) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [moreBusy, setMoreBusy] = useState(false);
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    setLoading(true);
    setError('');
    fetcher({ page: 0, size })
      .then((r) => {
        if (!active) return;
        setItems(r?.content || []);
        setPage(0);
        setLast(r?.last !== false);
      })
      .catch((e) => active && setError(errorMessage(e, 'Could not load data.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [fetcher, size, enabled, key]);

  const more = async () => {
    setMoreBusy(true);
    try {
      const r = await fetcher({ page: page + 1, size });
      setItems((prev) => [...prev, ...(r?.content || [])]);
      setPage((p) => p + 1);
      setLast(r?.last !== false);
    } catch (e) {
      setError(errorMessage(e, 'Could not load more.'));
    } finally {
      setMoreBusy(false);
    }
  };

  return { items, setItems, last, loading, moreBusy, error, more, reload: () => setKey((k) => k + 1) };
}

function ListShell({ list, empty, children }) {
  if (list.loading) return <ListSkeleton rows={5} height={64} />;
  if (list.error && list.items.length === 0) {
    return (
      <Banner type="error">
        {list.error}{' '}
        <button type="button" className="ui-btn ui-btn-sm" onClick={list.reload}>Retry</button>
      </Banner>
    );
  }
  if (list.items.length === 0) return empty;
  return (
    <>
      {children}
      {list.error && <Banner type="error">{list.error}</Banner>}
      {!list.last && (
        <button
          type="button"
          className="ui-btn ui-btn-secondary ui-btn-block"
          style={{ minHeight: 44 }}
          onClick={list.more}
          disabled={list.moreBusy}
        >
          {list.moreBusy ? <Spinner /> : null} Load more
        </button>
      )}
    </>
  );
}

function Overview({ goTo }) {
  const [counts, setCounts] = useState(null);
  const [error, setError] = useState('');
  const [key, setKey] = useState(0);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([
      adminApi.users({ size: 1 }),
      adminApi.bookings({ size: 1 }),
      adminApi.pendingVerifications({ size: 1 }),
    ])
      .then(([u, b, v]) => active && setCounts({ users: u?.totalElements ?? 0, bookings: b?.totalElements ?? 0, pending: v?.totalElements ?? 0 }))
      .catch((e) => active && setError(errorMessage(e, 'Could not load overview.')));
    return () => {
      active = false;
    };
  }, [key]);

  if (error) {
    return (
      <Banner type="error">
        {error}{' '}
        <button type="button" className="ui-btn ui-btn-sm" onClick={() => setKey((k) => k + 1)}>Retry</button>
      </Banner>
    );
  }
  if (!counts) return <PageLoader label="Loading overview…" />;

  const stat = (icon, value, label, tab) => (
    <div
      className="ui-card ui-stat ui-clickable"
      role="button"
      tabIndex={0}
      onClick={() => goTo(tab)}
      onKeyDown={(e) => e.key === 'Enter' && goTo(tab)}
    >
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div className="ui-stat-value">{value}</div>
      <div className="ui-stat-label">{label}</div>
    </div>
  );

  return (
    <>
      <div className="ui-grid-3">
        {stat('👥', counts.users, 'Total users', 'users')}
        {stat('📅', counts.bookings, 'Bookings', 'bookings')}
        {stat('🛡️', counts.pending, 'Pending verifications', 'verifications')}
      </div>
      {counts.pending > 0 && (
        <Banner type="warn" icon="🛡️">
          {counts.pending} buddy {counts.pending === 1 ? 'profile is' : 'profiles are'} waiting for review.
        </Banner>
      )}
      <div className="ui-section-title">Shortcuts</div>
      <div className="ui-grid-2">
        <button type="button" className="ui-btn ui-btn-primary" style={{ minHeight: 48 }} onClick={() => goTo('verifications')}>
          Review verifications
        </button>
        <button type="button" className="ui-btn ui-btn-secondary" style={{ minHeight: 48 }} onClick={() => goTo('audit')}>
          View audit log
        </button>
      </div>
    </>
  );
}

function Verifications() {
  const { toast } = useToast();
  const fetcher = useCallback((p) => adminApi.pendingVerifications(p), []);
  const list = usePagedList(fetcher, 50, true);
  const [pending, setPending] = useState(null); // { v, approve }
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const close = () => {
    if (busy) return;
    setPending(null);
    setNote('');
  };

  const submit = async () => {
    setBusy(true);
    try {
      await adminApi.decideVerification(pending.v.userId, pending.approve, note.trim());
      toast(pending.approve ? 'Buddy approved' : 'Buddy rejected', 'success');
      list.setItems((prev) => prev.filter((x) => x.userId !== pending.v.userId));
      setPending(null);
      setNote('');
    } catch (e) {
      toast(errorMessage(e, 'Could not save decision.'), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ListShell list={list} empty={<EmptyState icon="🎉" title="No pending verifications" text="All buddies are reviewed." />}>
        {list.items.map((v) => (
          <div key={v.userId} className="ui-card">
            <div className="ui-row">
              <Avatar name={v.fullName} />
              <div className="ui-grow">
                <div className="ui-strong">{v.fullName}</div>
                <div className="ui-small ui-muted" style={{ fontSize: 13 }}>💼 {v.yearsExperience ?? 0} yrs experience</div>
              </div>
            </div>
            {v.skills && (
              <div className="ad-pills">
                {v.skills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                  <span key={s} className="ad-pill">{s}</span>
                ))}
              </div>
            )}
            <div className="ui-btn-group" style={{ marginTop: 12 }}>
              <button type="button" className="ui-btn ui-btn-success" style={{ minHeight: 44 }} onClick={() => setPending({ v, approve: true })}>
                ✔️ Approve
              </button>
              <button type="button" className="ui-btn ui-btn-danger" style={{ minHeight: 44 }} onClick={() => setPending({ v, approve: false })}>
                ✖️ Reject
              </button>
            </div>
          </div>
        ))}
      </ListShell>
      <ConfirmModal
        open={!!pending}
        title={pending?.approve ? 'Approve this buddy?' : 'Reject this buddy?'}
        text={pending ? `${pending.v.fullName} will be notified.` : ''}
        confirmLabel={busy ? 'Saving…' : pending?.approve ? 'Approve' : 'Reject'}
        danger={pending ? !pending.approve : false}
        busy={busy}
        onConfirm={submit}
        onCancel={close}
      >
        <div className="ui-field" style={{ marginTop: 10 }}>
          <label className="ui-label" htmlFor="ad-note">Note (optional)</label>
          <textarea
            id="ad-note"
            className="ui-textarea"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Reason or message for the buddy"
          />
        </div>
      </ConfirmModal>
    </>
  );
}

function Users() {
  const fetcher = useCallback((p) => adminApi.users({ ...p, sort: 'createdAt,desc' }), []);
  const list = usePagedList(fetcher, 100, true);
  const [q, setQ] = useState('');
  const term = q.trim().toLowerCase();
  const rows = list.items.filter((u) => !term || `${u.fullName || ''} ${u.email || ''}`.toLowerCase().includes(term));

  return (
    <>
      <div className="ui-field">
        <input
          className="ui-input"
          type="search"
          placeholder="🔍 Search by name or email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search users"
          style={{ minHeight: 48 }}
        />
      </div>
      <ListShell list={list} empty={<EmptyState icon="👥" title="No users yet" />}>
        {rows.length === 0 ? (
          <EmptyState icon="🔎" title="No matches" text="Try a different name or email." />
        ) : (
          <div className="ui-list">
            {rows.map((u) => (
              <div key={u.id} className="ui-item">
                <Avatar name={u.fullName} size="sm" />
                <div className="ui-grow">
                  <div className="ui-item-title ui-clip">{u.fullName}</div>
                  <div className="ui-item-sub ui-clip">{u.email}</div>
                </div>
                <div className="ad-right">
                  <span className={`ui-chip ${ROLE_CLS[u.role] || ''}`}>{u.role}</span>
                  <span className="ui-small ui-muted">{humanise(u.status || '')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ListShell>
    </>
  );
}

function Bookings() {
  const fetcher = useCallback((p) => adminApi.bookings({ ...p, sort: 'createdAt,desc' }), []);
  const list = usePagedList(fetcher, 50, true);
  return (
    <ListShell list={list} empty={<EmptyState icon="📅" title="No bookings yet" />}>
      <div className="ui-list">
        {list.items.map((b) => (
          <div key={b.id} className="ui-item">
            <div className="ui-grow">
              <div className="ui-item-title ui-clip">
                {b.elderName} → {b.buddyName || 'unassigned'}
              </div>
              <div className="ui-item-sub">{formatDate(b.createdAt)} · {humanise(b.type || '')}</div>
            </div>
            <StatusChip status={b.status} />
          </div>
        ))}
      </div>
    </ListShell>
  );
}

function Audit() {
  const fetcher = useCallback((p) => adminApi.auditLog(p), []);
  const list = usePagedList(fetcher, 50, true);
  return (
    <ListShell list={list} empty={<EmptyState icon="📜" title="Nothing logged yet" />}>
      <div className="ui-list">
        {list.items.map((a) => (
          <div key={a.id} className="ui-item">
            <div className="ui-grow">
              <div className="ui-item-title">{humanise(a.action)}</div>
              {a.detail && <div className="ui-item-sub">{a.detail}</div>}
              <div className="ui-item-sub">{a.targetType}{a.targetId ? ` #${a.targetId}` : ''}</div>
            </div>
            <span className="ui-small ui-muted">{formatDateTime(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </ListShell>
  );
}

export default function Admin() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [tab, setTab] = useState('overview');
  const [outBusy, setOutBusy] = useState(false);

  const handleLogout = async () => {
    setOutBusy(true);
    try {
      await logout();
    } finally {
      navigate('/');
    }
  };

  return (
    <div className="ui-page">
      <div className="ui-topbar">
        <div className="ui-topbar-inner" style={{ maxWidth: 1100 }}>
          <div className="ui-topbar-texts">
            <h1 className="ui-title">🛠️ Admin Console</h1>
            <p className="ui-subtitle">Manage users, bookings and verifications</p>
          </div>
          <div className="ui-topbar-action">
            <button type="button" className="ui-btn ui-btn-sm" style={{ minHeight: 40 }} onClick={handleLogout} disabled={outBusy}>
              {outBusy ? <Spinner /> : '🚪'} Log out
            </button>
          </div>
        </div>
      </div>
      <div className="ui-container ui-wide">
        <div className="ui-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`ui-tab ${tab === t.key ? 'active' : ''}`}
              style={{ minHeight: 44 }}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
        {tab === 'overview' && <Overview goTo={setTab} />}
        {tab === 'verifications' && <Verifications />}
        {tab === 'users' && <Users />}
        {tab === 'bookings' && <Bookings />}
        {tab === 'audit' && <Audit />}
      </div>
    </div>
  );
}
