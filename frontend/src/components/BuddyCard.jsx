import React from 'react';
import './BuddyCard.css';

const BuddyCard = ({ buddy, onClick }) => {
  return (
    <div className="buddy-card" onClick={() => onClick && onClick(buddy)}>
      <div className="buddy-card-header">
        <img 
          src={buddy.profilePicture || '/buddy_logo.png'} 
          alt={buddy.name}
          className="buddy-avatar"
        />
        <div className="buddy-info">
          <h3 className="buddy-name">{buddy.name}</h3>
          <p className="buddy-service">{buddy.service}</p>
        </div>
        <div className="buddy-rating">
          <span className="star">⭐</span>
          <span className="rating-value">{buddy.rating}</span>
        </div>
      </div>
      
      <div className="buddy-card-body">
        <div className="buddy-tags">
          {buddy.tags && buddy.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
        
        <div className="buddy-stats">
          <div className="stat">
            <span className="stat-icon">✓</span>
            <span className="stat-value">{buddy.completedJobs || 0} jobs</span>
          </div>
          <div className="stat">
            <span className="stat-icon">📍</span>
            <span className="stat-value">{buddy.distance || '0.5'} km</span>
          </div>
          <div className="stat">
            <span className="stat-icon">💰</span>
            <span className="stat-value">₹{buddy.price || '200'}/hr</span>
          </div>
        </div>
      </div>
      
      <div className="buddy-card-footer">
        <button className="view-profile-btn">View Profile</button>
      </div>
    </div>
  );
};

export default BuddyCard;
