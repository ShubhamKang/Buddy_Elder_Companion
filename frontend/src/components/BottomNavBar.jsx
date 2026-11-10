import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { bottomNavFor } from '../utils/nav';
import './BottomNavBar.css';

/** Mobile bottom navigation. Items depend on the user's role (see utils/nav.js). */
const BottomNavBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Admins use the console's own tabs rather than a bottom bar.
  if (user?.role === 'ADMIN') return null;

  const navItems = bottomNavFor(user?.role);

  const isActive = (path) => {
    const [pathname, query] = path.split('?');
    if (query) return location.pathname === pathname && location.search.includes(query);
    // "/bookings" shouldn't light up while on "/bookings?tab=open".
    if (pathname === '/bookings' && location.search.includes('tab=open')) return false;
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`);
  };

  return (
    <nav className="bottom-navbar" aria-label="Main navigation">
      <div className="nav-container">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
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
