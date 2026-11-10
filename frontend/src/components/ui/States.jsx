import React from 'react';

export function EmptyState({ icon = '📭', title, text, action = null }) {
  return (
    <div className="ui-empty">
      <div className="ui-empty-icon" aria-hidden="true">{icon}</div>
      <h3>{title}</h3>
      {text ? <p>{text}</p> : null}
      {action}
    </div>
  );
}

export function Spinner() {
  return <span className="ui-spinner" role="status" aria-label="Loading" />;
}

export function PageLoader({ label = 'Loading…' }) {
  return (
    <div className="ui-loader">
      <Spinner />
      <span>{label}</span>
    </div>
  );
}

export function ListSkeleton({ rows = 3, height = 76 }) {
  return (
    <div className="ui-list" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ui-skeleton" style={{ height }} />
      ))}
    </div>
  );
}

export function Banner({ type = 'info', icon, children }) {
  const defaults = { info: 'ℹ️', warn: '⚠️', error: '⚠️', ok: '✅' };
  return (
    <div className={`ui-banner ${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <span aria-hidden="true">{icon || defaults[type]}</span>
      <div>{children}</div>
    </div>
  );
}
