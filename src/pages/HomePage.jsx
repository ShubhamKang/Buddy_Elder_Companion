import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import LocationPopup from '../location/LocationPopup';
import { db, auth } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import BottomNavBar from '../components/BottomNavBar';
import BuddyCard from '../components/BuddyCard';
import './HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null); // eslint-disable-line no-unused-vars
  const [nearbyBuddies, setNearbyBuddies] = useState([]);
  const [trendingBuddies, setTrendingBuddies] = useState([]);
  const [userName, setUserName] = useState('');
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  // Service categories
  const categories = [
    { id: 'transport', icon: '🚗', label: 'Transport', color: '#3b82f6' },
    { id: 'repair', icon: '🔧', label: 'Repair', color: '#10b981' },
    { id: 'education', icon: '📚', label: 'Education', color: '#8b5cf6' },
    { id: 'home', icon: '🏠', label: 'Home Help', color: '#f59e0b' },
    { id: 'business', icon: '💼', label: 'Business', color: '#6366f1' },
    { id: 'fitness', icon: '🏋️', label: 'Fitness', color: '#ef4444' },
    { id: 'shopping', icon: '🛒', label: 'Shopping', color: '#14b8a6' },
    { id: 'more', icon: '➕', label: 'More', color: '#64748b' }
  ];

  // Mock data for nearby buddies
  const mockNearbyBuddies = [
    {
      id: 1,
      name: 'Rajesh Kumar',
      service: 'Driver & Transport',
      rating: 4.9,
      profilePicture: null,
      tags: ['Verified', 'Quick'],
      completedJobs: 156,
      distance: '0.5',
      price: '200'
    },
    {
      id: 2,
      name: 'Priya Sharma',
      service: 'Home Cleaning',
      rating: 4.7,
      profilePicture: null,
      tags: ['Professional', 'Reliable'],
      completedJobs: 89,
      distance: '1.2',
      price: '150'
    },
    {
      id: 3,
      name: 'Amit Patel',
      service: 'Electrician',
      rating: 4.8,
      profilePicture: null,
      tags: ['Expert', '24/7'],
      completedJobs: 234,
      distance: '2.0',
      price: '300'
    }
  ];

  // Mock data for trending buddies
  const mockTrendingBuddies = [
    {
      id: 4,
      name: 'Sneha Gupta',
      service: 'Yoga Instructor',
      rating: 5.0,
      profilePicture: null,
      tags: ['Certified', 'Popular'],
      completedJobs: 412,
      distance: '3.5',
      price: '500'
    },
    {
      id: 5,
      name: 'Vikram Singh',
      service: 'Personal Trainer',
      rating: 4.9,
      profilePicture: null,
      tags: ['Fitness Expert'],
      completedJobs: 198,
      distance: '1.8',
      price: '400'
    },
    {
      id: 6,
      name: 'Anita Desai',
      service: 'Tutor - Mathematics',
      rating: 4.8,
      profilePicture: null,
      tags: ['Experienced', 'Patient'],
      completedJobs: 167,
      distance: '2.5',
      price: '350'
    }
  ];

  useEffect(() => {
    // Load nearby buddies
    setNearbyBuddies(mockNearbyBuddies);
    setTrendingBuddies(mockTrendingBuddies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When Home mounts, if no location stored, show Zepto-like modal
  useEffect(() => {
    try {
      const raw = localStorage.getItem('userLocation');
      if (!raw) setShowLocationPrompt(true);
    } catch (_) { setShowLocationPrompt(true); }
  }, []);

  // Load current user profile name from Firestore (if signed in)
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      try {
        if (!user) {
          setUserName('');
          return;
        }
        const ref = doc(db, 'users', user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setUserName(data.fullName || '');
        } else {
          setUserName('');
        }
      } catch (_) {
        setUserName('');
      }
    });
    return () => unsub();
  }, []);

  const handleEmergencyBook = () => {
    navigate('/needhelp');
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    navigate(`/category/${category.id}`);
  };

  const handleBuddyClick = (buddy) => {
    navigate(`/buddy/${buddy.id}`);
  };

  return (
    <div className="home-page">
      <Header userName={userName} onLocationClick={() => setShowLocationPrompt(true)} />
      
      <main className="home-content">
        {/* Emergency Booking Section */}
        <section className="emergency-section">
          <button type="button" className="emergency-strip" onClick={handleEmergencyBook}>
            <span className="strip-icon">📞</span>
            <span className="strip-text">Emergency? Book instant help</span>
            <span className="strip-cta">Book now →</span>
          </button>
        </section>

        {/* Categories Section */}
        <section className="categories-section">
          <h3 className="section-title">What do you need help with?</h3>
          <div className="categories-grid">
            {categories.map(category => (
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

        {/* Nearby Buddies Section */}
        <section className="nearby-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="location-icon">📍</span>
              Near You ({nearbyBuddies.length})
            </h3>
            <button className="see-all-btn" onClick={() => navigate('/nearby')}>
              See All →
            </button>
          </div>
          <div className="horizontal-scroll">
            <div className="scroll-container">
              {nearbyBuddies.map(buddy => (
                <BuddyCard 
                  key={buddy.id} 
                  buddy={buddy} 
                  onClick={handleBuddyClick}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="trending-section">
          <div className="section-header">
            <h3 className="section-title">
              <span className="fire-icon">🔥</span>
              Popular This Week
            </h3>
            <button className="see-all-btn" onClick={() => navigate('/trending')}>
              See All →
            </button>
          </div>
          <div className="horizontal-scroll">
            <div className="scroll-container">
              {trendingBuddies.map(buddy => (
                <BuddyCard 
                  key={buddy.id} 
                  buddy={buddy} 
                  onClick={handleBuddyClick}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Special Offers Banner */}
        <section className="offers-section">
          <div className="offer-banner">
            <div className="offer-content">
              <h3 className="offer-title">🎉 First Booking Offer!</h3>
              <p className="offer-text">Get 20% off on your first buddy booking</p>
              <button className="offer-btn">Claim Offer</button>
            </div>
            <div className="offer-decoration">
              <span className="decoration-emoji">🎁</span>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
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

        {/* Safety Section */}
        <section className="safety-section">
          <div className="safety-card">
            <div className="safety-icon">🛡️</div>
            <div className="safety-content">
              <h4 className="safety-title">Your Safety, Our Priority</h4>
              <p className="safety-text">All buddies are verified and background checked</p>
            </div>
          </div>
        </section>
      </main>

      <BottomNavBar />
      <LocationPopup isOpen={showLocationPrompt} onClose={() => setShowLocationPrompt(false)} onLocationSelect={() => setShowLocationPrompt(false)} />
    </div>
  );
};

export default HomePage;
