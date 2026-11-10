import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LocationPopup from '../location/LocationPopup';
import { useAuth } from '../auth/AuthContext';
import { profilesApi } from '../api/profiles';
import { bookingsApi, geoApi } from '../api/endpoints';
import BottomNavBar from '../components/BottomNavBar';
import BuddyCard from '../components/BuddyCard';
import StatusChip from '../components/ui/StatusChip';
import { getSavedLocation } from '../utils/format';
import './HomePage.css';

// Quick actions surface the main product features right on the home screen.
const QUICK_ACTIONS = [
  { id: 'book', icon: '📅', label: 'Book help', path: '/book', color: '#667eea' },
  { id: 'sos', icon: '🆘', label: 'SOS', path: '/sos', color: '#ef4444' },
  { id: 'care', icon: '⏰', label: 'Reminders', path: '/care', color: '#f59e0b' },
  { id: 'chat', icon: '💬', label: 'Messages', path: '/chats', color: '#10b981' },
];

// Elder-care service categories; each opens a skills search.
const CATEGORIES = [
  { id: 'companion', icon: '🤝', label: 'Companion', color: '#8b5cf6' },
  { id: 'groceries', icon: '🛒', label: 'Groceries', color: '#14b8a6' },
  { id: 'medical', icon: '🏥', label: 'Medical', color: '#ef4444' },
  { id: 'home', icon: '🏠', label: 'Home Help', color: '#f59e0b' },
  { id: 'walk', icon: '🚶', label: 'Walks', color: '#10b981' },
  { id: 'cooking', icon: '🍳', label: 'Cooking', color: '#f97316' },
  { id: 'transport', icon: '🚗', label: 'Transport', color: '#3b82f6' },
  { id: 'more', icon: '➕', label: 'See all', color: '#64748b' },
];

const toCard = (b) => {
  const skills = (b.skills || '').split(',').map((s) => s.trim()).filter(Boolean);
  const verified = b.verificationStatus === 'APPROVED';
  const rated = Number(b.ratingCount) > 0;
  return {
    id: b.userId,
    name: b.fullName || 'Buddy',
    service: skills[0] || 'Care companion',
    rating: rated ? Number(b.ratingAverage).toFixed(1) : 'New',
    profilePicture: null,
    tags: [...(verified ? ['Verified'] : []), ...skills.slice(1, 3)],
    experience: b.yearsExperience ?? 0,
    distance: b.distanceKm !== undefined ? b.distanceKm : null,
    price: b.hourlyRate !== undefined && b.hourlyRate !== null ? Number(b.hourlyRate) : null,
  };
};

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [nearbyBuddies, setNearbyBuddies] = useState([]);
  const [topBuddies, setTopBuddies] = useState([]);
  const [activeBooking, setActiveBooking] = useState(null);
  const [loadingBuddies, setLoadingBuddies] = useState(true);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locVersion, setLocVersion] = useState(0);

  const firstName = (user?.fullName || '').split(' ')[0];

  // Ask for a location the first time (existing behaviour).
  useEffect(() => {
    try {
      if (!localStorage.getItem('userLocation')) setShowLocationPrompt(true);
    } catch (_) {
      setShowLocationPrompt(true);
    }
  }, []);

  // Re-load buddies whenever the user picks a new location.
  useEffect(() => {
    const bump = () => setLocVersion((v) => v + 1);
    window.addEventListener('userLocationUpdated', bump);
    return () => window.removeEventListener('userLocationUpdated', bump);
  }, []);

  const loadBuddies = useCallback(async () => {
    setLoadingBuddies(true);
    const loc = getSavedLocation();
    const [nearbyResult, topResult] = await Promise.allSettled([
      loc && loc.lat !== null
        ? geoApi.nearby(loc.lat, loc.lng, 25, 10)
        : profilesApi.listAvailableBuddies({ size: 10 }).then((p) => p.content),
      profilesApi
        .listAvailableBuddies({ size: 10, sort: 'ratingAverage,desc' })
        .then((p) => p.content),
    ]);
    setNearbyBuddies(nearbyResult.status === 'fulfilled' ? (nearbyResult.value || []).map(toCard) : []);
    setTopBuddies(topResult.status === 'fulfilled' ? (topResult.value || []).map(toCard) : []);
    setLoadingBuddies(false);
  }, []);

  useEffect(() => {
    loadBuddies();
  }, [loadBuddies, locVersion]);

  // Surface the elder's most recent unfinished booking right on the home screen.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const page = await bookingsApi.mineElder({ size: 10, sort: 'createdAt,desc' });
        if (!active) return;
        const rank = { IN_PROGRESS: 0, ACCEPTED: 1, REQUESTED: 2 };
        const open = (page?.content || [])
          .filter((b) => b.status in rank)
          .sort((a, b) => rank[a.status] - rank[b.status])[0];
        setActiveBooking(open || null);
      } catch (_) {
        /* non-critical */
      }
    };
    load();
    const id = setInterval(load, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  const handleCategoryClick = (category) => {
    navigate(category.id === 'more' ? '/nearby' : `/nearby?q=${encodeURIComponent(category.label)}`);
  };

  const handleBuddyClick = (buddy) => navigate(`/buddy/${buddy.id}`);

  const bookingHeadline = () => {
    if (!activeBooking) return '';
    if (activeBooking.status === 'REQUESTED') return 'Looking for a buddy near you…';
    if (activeBooking.status === 'ACCEPTED') return `${activeBooking.buddyName || 'Your buddy'} accepted your request`;
    return `${activeBooking.buddyName || 'Your buddy'} is with you`;
  };

  const renderBuddies = (list, emptyText) => {
    if (loadingBuddies) {
      return (
        <div className="horizontal-scroll">
          <div className="scroll-container">
            {[1, 2, 3].map((i) => (
              <div key={i} className="ui-skeleton hp-card-skeleton" />
            ))}
          </div>
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="hp-empty">
          <span className="hp-empty-icon" aria-hidden="true">🧭</span>
          <p>{emptyText}</p>
          <button type="button" className="see-all-btn" onClick={() => navigate('/nearby')}>
            Browse all buddies →
          </button>
        </div>
      );
    }
    return (
      <div className="horizontal-scroll">
        <div className="scroll-container">
          {list.map((buddy) => (
            <BuddyCard key={buddy.id} buddy={buddy} onClick={handleBuddyClick} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="home-page">
      <Header userName={firstName} onLocationClick={() => setShowLocationPrompt(true)} />

      <main className="home-content">
        {/* Greeting */}
        <section className="hp-greeting">
          <h2>Hello{firstName ? `, ${firstName}` : ''} 👋</h2>
          <p>How can we help you today?</p>
        </section>

        {/* Active booking */}
        {activeBooking && (
          <section className="hp-active" onClick={() => navigate(`/bookings/${activeBooking.id}`)} role="button" tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/bookings/${activeBooking.id}`); }}>
            <div className="hp-active-pulse" aria-hidden="true" />
            <div className="hp-active-texts">
              <span className="hp-active-label">Current booking</span>
              <strong>{bookingHeadline()}</strong>
              <span className="hp-active-sub">Tap to {activeBooking.status === 'REQUESTED' ? 'view details' : 'track & chat'}</span>
            </div>
            <StatusChip status={activeBooking.status} />
          </section>
        )}

        {/* Emergency strip */}
        <section className="emergency-section">
          <button type="button" className="emergency-strip" onClick={() => navigate('/sos')}>
            <span className="strip-icon">🆘</span>
            <span className="strip-text">Emergency? Alert your contacts instantly</span>
            <span className="strip-cta">SOS →</span>
          </button>
        </section>

        {/* Quick actions */}
        <section className="categories-section">
          <h3 className="section-title">Quick actions</h3>
          <div className="categories-grid">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.id}
                className="category-item"
                onClick={() => navigate(a.path)}
                style={{ '--category-color': a.color }}
              >
                <div className="category-icon">{a.icon}</div>
                <span className="category-label">{a.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Categories */}
        <section className="categories-section">
          <h3 className="section-title">What do you need help with?</h3>
          <div className="categories-grid">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                className="category-item"
                onClick={() => handleCategoryClick(category)}
                style={{ '--category-color': category.color }}
              >
                <div className="category-icon">{category.icon}</div>
                <span className="category-label">{category.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Nearby */}
        <section className="nearby-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="location-icon">📍</span>
              Near You {!loadingBuddies && `(${nearbyBuddies.length})`}
            </h3>
            <button className="see-all-btn" onClick={() => navigate('/nearby')}>
              See All →
            </button>
          </div>
          {renderBuddies(nearbyBuddies, 'No buddies found near you yet. Try widening your search.')}
        </section>

        {/* Top rated */}
        <section className="trending-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="fire-icon">🔥</span>
              Top Rated
            </h3>
            <button className="see-all-btn" onClick={() => navigate('/nearby')}>
              See All →
            </button>
          </div>
          {renderBuddies(topBuddies, 'Top rated buddies will appear here.')}
        </section>

        {/* SOS promo */}
        <section className="offers-section">
          <div className="offer-banner">
            <div className="offer-content">
              <h3 className="offer-title">🛡️ Stay protected</h3>
              <p className="offer-text">Add emergency contacts so help is always one tap away.</p>
              <button className="offer-btn" onClick={() => navigate('/sos')}>Set up SOS</button>
            </div>
            <div className="offer-decoration">
              <span className="decoration-emoji">🆘</span>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="how-it-works">
          <h3 className="section-title">How Buddy Works</h3>
          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-icon">🔍</div>
              <h4 className="step-title">Search</h4>
              <p className="step-desc">Find the perfect buddy for your needs</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <div className="step-icon">📅</div>
              <h4 className="step-title">Book</h4>
              <p className="step-desc">Schedule at your convenience</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <div className="step-icon">✅</div>
              <h4 className="step-title">Get Help</h4>
              <p className="step-desc">Receive quality assistance</p>
            </div>
          </div>
        </section>

        {/* Safety */}
        <section className="safety-section">
          <div className="safety-card">
            <div className="safety-icon">🛡️</div>
            <div className="safety-content">
              <h4 className="safety-title">Your Safety, Our Priority</h4>
              <p className="safety-text">Buddies are reviewed by our team before they get a Verified badge</p>
            </div>
          </div>
        </section>
      </main>

      <BottomNavBar />
      <LocationPopup
        isOpen={showLocationPrompt}
        onClose={() => setShowLocationPrompt(false)}
        onLocationSelect={() => setShowLocationPrompt(false)}
      />
    </div>
  );
};

export default HomePage;
