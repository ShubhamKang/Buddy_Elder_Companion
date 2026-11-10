import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Sticky page header: round back button, title, optional subtitle and a
 * right-hand action slot. Matches the back-button style used on Settings/Help.
 */
export default function PageHeader({ title, subtitle, onBack, backTo = '/home', right = null, hideBack = false }) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) return onBack();
    // Prefer real history; fall back to a sensible route when opened directly.
    if (window.history.length > 1) return navigate(-1);
    return navigate(backTo);
  };

  return (
    <div className="ui-topbar">
      <div className="ui-topbar-inner">
        {!hideBack && (
          <button type="button" className="ui-back" onClick={handleBack} aria-label="Go back">
            ←
          </button>
        )}
        <div className="ui-topbar-texts">
          <h1 className="ui-title">{title}</h1>
          {subtitle ? <p className="ui-subtitle">{subtitle}</p> : null}
        </div>
        {right ? <div className="ui-topbar-action">{right}</div> : null}
      </div>
    </div>
  );
}
