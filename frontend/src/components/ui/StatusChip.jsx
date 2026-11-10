import React from 'react';

const META = {
  REQUESTED: { label: 'Requested', icon: '🕒', cls: 'requested' },
  ACCEPTED: { label: 'Accepted', icon: '👍', cls: 'accepted' },
  IN_PROGRESS: { label: 'In progress', icon: '🚶', cls: 'in_progress' },
  COMPLETED: { label: 'Completed', icon: '✅', cls: 'completed' },
  CANCELLED: { label: 'Cancelled', icon: '🚫', cls: 'cancelled' },
  REJECTED: { label: 'Declined', icon: '✖️', cls: 'rejected' },
  // payments
  CAPTURED: { label: 'Paid', icon: '💳', cls: 'completed' },
  REFUNDED: { label: 'Refunded', icon: '↩️', cls: 'accepted' },
  FAILED: { label: 'Failed', icon: '⚠️', cls: 'rejected' },
  CREATED: { label: 'Pending', icon: '⏳', cls: 'requested' },
  // verification
  PENDING: { label: 'Pending review', icon: '⏳', cls: 'requested' },
  APPROVED: { label: 'Verified', icon: '✔️', cls: 'completed' },
  // sos
  ACTIVE: { label: 'Active', icon: '🚨', cls: 'rejected' },
  RESOLVED: { label: 'Resolved', icon: '✅', cls: 'completed' },
};

/** Colored pill for booking / payment / verification / SOS statuses. */
export default function StatusChip({ status, hideIcon = false }) {
  const meta = META[status] || { label: status || 'Unknown', icon: '•', cls: '' };
  return (
    <span className={`ui-chip ${meta.cls}`}>
      {!hideIcon && <span aria-hidden="true">{meta.icon}</span>}
      {meta.label}
    </span>
  );
}
