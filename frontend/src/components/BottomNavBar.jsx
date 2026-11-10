import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './BottomNavBar.css';

const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: 'home', label: 'Home', icon: '🏠', path: '/home' },
    { id: 'search', label: 'Search', icon: '🔍', path: '/search' },
    { id: 'book', label: 'Book', icon: '➕', path: '/book-service' },
    { id: 'chat', label: 'Chat', icon: '💬', path: '/chat' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' }
  ];

  const handleNavClick = (path) => {
    navigate(path);
  };

  return (
    <nav className="bottom-navbar">
      <div className="nav-container">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavClick(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavBar;

