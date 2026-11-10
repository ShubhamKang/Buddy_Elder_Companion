import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './auth/userlogin';
import BuddyLogin from './auth/buddy_Login';
import BuddyInfo from './pages/buddyinfo';
import UserInfo from './pages/userinfo';
import ProtectedRoute, { GuestOnly } from './auth/ProtectedRoute';
import Skeleton from './components/Skeleton';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

// Existing screens
const HomePage = React.lazy(() => import('./pages/HomePage'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NeedHelp = React.lazy(() => import('./pages/needhelp'));
const Addresses = React.lazy(() => import('./address&location/addressespage'));
const MapSelectPage = React.lazy(() => import('./address&location/mapselectpage'));

// Booking & care features
const Book = React.lazy(() => import('./pages/Book'));
const Bookings = React.lazy(() => import('./pages/Bookings'));
const BookingDetail = React.lazy(() => import('./pages/BookingDetail'));
const Chats = React.lazy(() => import('./pages/Chats'));
const ChatRoom = React.lazy(() => import('./pages/ChatRoom'));
const Sos = React.lazy(() => import('./pages/Sos'));
const Care = React.lazy(() => import('./pages/Care'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
const Nearby = React.lazy(() => import('./pages/Nearby'));
const BuddyProfilePage = React.lazy(() => import('./pages/BuddyProfilePage'));
const BuddyDashboard = React.lazy(() => import('./pages/BuddyDashboard'));
const Admin = React.lazy(() => import('./pages/Admin'));

const ELDER = ['ELDER'];
const BUDDY = ['BUDDY'];
const ADMIN = ['ADMIN'];

/** Wraps an element so only signed-in users (optionally with given roles) see it. */
const guard = (element, roles) => <ProtectedRoute roles={roles}>{element}</ProtectedRoute>;

function App() {
  const [appLoading] = useState(false);
  return (
    <ErrorBoundary isLoading={appLoading}>
      <Router>
        <div className="App">
          <Suspense fallback={<Skeleton />}>
            <Routes>
              {/* Auth */}
              <Route path="/" element={<GuestOnly><UserLogin /></GuestOnly>} />
              <Route path="/buddy-login" element={<GuestOnly><BuddyLogin /></GuestOnly>} />

              {/* Onboarding */}
              <Route path="/userinfo" element={guard(<UserInfo />, ELDER)} />
              <Route path="/buddy-info" element={guard(<BuddyInfo />, BUDDY)} />

              {/* Role homes: /home sends buddies and admins to their own dashboards */}
              <Route path="/home" element={guard(<HomePage />, ELDER)} />
              <Route path="/buddy-dashboard" element={guard(<BuddyDashboard />, BUDDY)} />
              <Route path="/admin" element={guard(<Admin />, ADMIN)} />

              {/* Bookings & messaging */}
              <Route path="/book" element={guard(<Book />, ELDER)} />
              <Route path="/bookings" element={guard(<Bookings />, [...ELDER, ...BUDDY])} />
              <Route path="/bookings/:id" element={guard(<BookingDetail />, [...ELDER, ...BUDDY])} />
              <Route path="/bookings/:id/chat" element={guard(<ChatRoom />, [...ELDER, ...BUDDY])} />
              <Route path="/chats" element={guard(<Chats />, [...ELDER, ...BUDDY])} />

              {/* Discovery */}
              <Route path="/nearby" element={guard(<Nearby />)} />
              <Route path="/buddy/:id" element={guard(<BuddyProfilePage />)} />

              {/* Safety & care */}
              <Route path="/sos" element={guard(<Sos />, ELDER)} />
              <Route path="/care" element={guard(<Care />, ELDER)} />

              {/* Account */}
              <Route path="/notifications" element={guard(<Notifications />)} />
              <Route path="/wallet" element={guard(<Wallet />)} />
              <Route path="/settings" element={guard(<Settings />)} />
              <Route path="/profile" element={guard(<Profile />)} />
              <Route path="/needhelp" element={guard(<NeedHelp />)} />
              <Route path="/addresses" element={guard(<Addresses />)} />
              <Route path="/select-location" element={guard(<MapSelectPage />)} />

              {/* Legacy / convenience paths */}
              <Route path="/search" element={<Navigate to="/nearby" replace />} />
              <Route path="/trending" element={<Navigate to="/nearby" replace />} />
              <Route path="/book-service" element={<Navigate to="/book" replace />} />
              <Route path="/emergency-booking" element={<Navigate to="/sos" replace />} />
              <Route path="/chat" element={<Navigate to="/chats" replace />} />
              <Route path="/category/:id" element={<Navigate to="/nearby" replace />} />

              {/* Unknown routes */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
