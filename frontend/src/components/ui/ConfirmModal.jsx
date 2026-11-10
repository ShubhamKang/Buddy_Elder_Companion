import React from 'react';

/** Bottom-sheet style confirmation dialog (centered on larger screens). */
export default function ConfirmModal({
  open,
  title,
  text,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
  children = null,
}) {
  if (!open) return null;
  return (
    <div className="ui-modal-overlay" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="ui-modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {text ? <p>{text}</p> : null}
        {children}
        <div className="ui-btn-group" style={{ marginTop: 14 }}>
          <button type="button" className="ui-btn" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`ui-btn ${danger ? 'ui-btn-danger' : 'ui-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
