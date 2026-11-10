import React from 'react';
import Avatar from './ui/Avatar';
import './BuddyCard.css';

/**
 * Compact buddy summary card used on the home screen. Accepts the normalised
 * shape built by HomePage: { id, name, service, rating, tags, experience,
 * distance, price, profilePicture }. Missing values are simply hidden.
 */
const BuddyCard = ({ buddy, onClick }) => {
  const hasRating = buddy.rating !== undefined && buddy.rating !== null && buddy.rating !== '';
  return (
    <div
      className="buddy-card"
      onClick={() => onClick && onClick(buddy)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick && onClick(buddy);
      }}
    >
      <div className="buddy-card-header">
        {buddy.profilePicture ? (
          <img src={buddy.profilePicture} alt={buddy.name} className="buddy-avatar" />
        ) : (
          <Avatar name={buddy.name} />
        )}
        <div className="buddy-info">
          <h3 className="buddy-name">{buddy.name}</h3>
          <p className="buddy-service">{buddy.service}</p>
          {hasRating && <span className="buddy-rating-inline">⭐ {buddy.rating}</span>}
        </div>
        {hasRating && (
          <div className="buddy-rating">
            <span className="star">⭐</span>
            <span className="rating-value">{buddy.rating}</span>
          </div>
        )}
      </div>

      <div className="buddy-card-body">
        <div className="buddy-tags">
          {buddy.tags && buddy.tags.map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>

        <div className="buddy-stats">
          {buddy.experience !== undefined && buddy.experience !== null && (
            <div className="stat">
              <span className="stat-icon">✓</span>
              <span className="stat-value">{buddy.experience} yrs</span>
            </div>
          )}
          {buddy.distance !== undefined && buddy.distance !== null && buddy.distance !== '' && (
            <div className="stat">
              <span className="stat-icon">📍</span>
              <span className="stat-value">{buddy.distance} km</span>
            </div>
          )}
          {buddy.price !== undefined && buddy.price !== null && buddy.price !== '' && (
            <div className="stat">
              <span className="stat-icon">💰</span>
              <span className="stat-value">₹{buddy.price}/hr</span>
            </div>
          )}
        </div>
      </div>

      <div className="buddy-card-footer">
        <button type="button" className="view-profile-btn">View Profile</button>
      </div>
    </div>
  );
};

export default BuddyCard;
