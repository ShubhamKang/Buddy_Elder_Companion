import React, { Suspense, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserLogin from './auth/userlogin';
import BuddyLogin from './auth/buddy_Login';
import BuddyInfo from './pages/buddyinfo';
import UserInfo from './pages/userinfo';
import Skeleton from './components/Skeleton';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

const HomePage = React.lazy(() => import('./pages/HomePage'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Profile = React.lazy(() => import('./pages/Profile'));
const NeedHelp = React.lazy(() => import('./pages/needhelp'));
const Addresses = React.lazy(() => import('./adress&location/addressespage'));
const MapSelectPage = React.lazy(() => import('./adress&location/mapselectpage'));

function App() {
  const [appLoading, setAppLoading] = useState(false);
  return (
    <ErrorBoundary isLoading={appLoading}>
      <Router>
        <div className="App">
          <Suspense fallback={<Skeleton />}>
            <Routes>
            {/* Auth Routes */}
            <Route path="/" element={<UserLogin />} />
            <Route path="/buddy-login" element={<BuddyLogin />} />
            
            {/* Registration Routes */}
            <Route path="/buddy-info" element={<BuddyInfo />} />
            <Route path="/userinfo" element={<UserInfo />} />
            
            {/* Main App Routes */}
            <Route path="/home" element={<HomePage />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/needhelp" element={<NeedHelp />} />
            <Route path="/addresses" element={<Addresses />} />
            <Route path="/select-location" element={<MapSelectPage />} />
            
            {/* Placeholder routes for navigation */}
            <Route path="/search" element={<HomePage />} />
            <Route path="/book-service" element={<HomePage />} />
            <Route path="/chat" element={<HomePage />} />
            <Route path="/profile" element={<HomePage />} />
            <Route path="/emergency-booking" element={<HomePage />} />
            <Route path="/category/:id" element={<HomePage />} />
            <Route path="/buddy/:id" element={<HomePage />} />
            <Route path="/nearby" element={<HomePage />} />
            <Route path="/trending" element={<HomePage />} />
            
            {/* Redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
