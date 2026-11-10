import React from 'react';
import { initials } from '../../utils/format';

const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#06b6d4,#3b82f6)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
  'linear-gradient(135deg,#10b981,#14b8a6)',
  'linear-gradient(135deg,#8b5cf6,#ec4899)',
  'linear-gradient(135deg,#f97316,#f59e0b)',
];

const pick = (seed = '') => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
};

/** Initials avatar with a deterministic gradient (no image upload needed). */
export default function Avatar({ name = '', size = '', className = '' }) {
  return (
    <div
      className={`ui-avatar ${size ? `ui-${size}` : ''} ${className}`}
      style={{ background: pick(name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
