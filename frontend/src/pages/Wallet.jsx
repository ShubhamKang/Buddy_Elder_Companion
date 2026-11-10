import React, { useCallback, useEffect, useState } from 'react';
import './Wallet.css';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, Spinner, PageLoader, ListSkeleton, Banner } from '../components/ui/States';
import { useToast } from '../components/ui/Toast';
import BottomNavBar from '../components/BottomNavBar';
import { walletApi } from '../api/endpoints';
import { formatMoney, formatDateTime, errorMessage } from '../utils/format';

const PAGE_SIZE = 20;

const humanise = (type = '') =>
  type
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');

export default function Wallet() {
  const { toast } = useToast();
  const [wallet, setWallet] = useState(null);
  const [txs, setTxs] = useState([]);
  const [page, setPage] = useState(0);
  const [last, setLast] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      walletApi.get(),
      walletApi.transactions({ page: 0, size: PAGE_SIZE, sort: 'createdAt,desc' }),
    ])
      .then(([w, t]) => {
        if (!active) return;
        setWallet(w);
        setTxs(t?.content || []);
        setPage(0);
        setLast(t?.last !== false);
      })
      .catch((err) => active && setError(errorMessage(err, 'Could not load your wallet.')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const next = page + 1;
      const t = await walletApi.transactions({ page: next, size: PAGE_SIZE, sort: 'createdAt,desc' });
      setTxs((prev) => {
        const seen = new Set(prev.map((x) => x.id));
        return [...prev, ...(t?.content || []).filter((x) => !seen.has(x.id))];
      });
      setPage(next);
      setLast(t?.last !== false);
    } catch (err) {
      toast(errorMessage(err, 'Could not load more transactions.'), 'error');
    } finally {
      setLoadingMore(false);
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <>
          <PageLoader label="Loading your wallet…" />
          <ListSkeleton rows={3} height={64} />
        </>
      );
    }
    if (error) {
      return (
        <Banner type="error">
          <div>{error}</div>
          <button type="button" className="ui-btn ui-btn-sm" style={{ marginTop: 8 }} onClick={load}>
            Try again
          </button>
        </Banner>
      );
    }
    return (
      <>
        <div className="ui-hero">
          <p>Available balance</p>
          <div className="wallet-balance">{formatMoney(wallet?.balance)}</div>
          <span className="ui-chip" style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
            💰 {wallet?.currency || 'INR'}
          </span>
        </div>

        <Banner type="info">Payments run in sandbox mode - no real money moves.</Banner>

        <div className="ui-section-title">Transactions</div>
        {txs.length === 0 ? (
          <EmptyState
            icon="💰"
            title="No transactions yet"
            text="When a booking is refunded, the money will show up here."
          />
        ) : (
          <>
            <div className="ui-list">
              {txs.map((t) => {
                const credit = t.direction === 'CREDIT';
                return (
                  <div key={t.id} className="ui-item" style={{ cursor: 'default' }}>
                    <span className={`wallet-icon ${credit ? 'credit' : 'debit'}`} aria-hidden="true">
                      {credit ? '⬇️' : '⬆️'}
                    </span>
                    <div className="ui-grow">
                      <div className="ui-item-title ui-clip">{t.description || humanise(t.type) || 'Transaction'}</div>
                      <div className="ui-item-sub">{formatDateTime(t.createdAt)}</div>
                    </div>
                    <div className={`wallet-amount ${credit ? 'credit' : 'debit'}`}>
                      {credit ? '+' : '-'}{formatMoney(t.amount)}
                    </div>
                  </div>
                );
              })}
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
        )}
      </>
    );
  };

  return (
    <div className="ui-page">
      <PageHeader title="Wallet" subtitle="Your balance and refunds" />
      <div className="ui-container">{renderBody()}</div>
      <BottomNavBar />
    </div>
  );
}
