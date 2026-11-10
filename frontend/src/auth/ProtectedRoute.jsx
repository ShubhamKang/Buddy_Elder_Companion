import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { PageLoader } from '../components/ui/States';
import { homePathFor } from '../utils/nav';

/**
 * Guards routes that need a signed-in user. Pass `roles` (array) to restrict
 * by role; users with the wrong role are sent to their own home screen.
 */
export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <PageLoader label="Loading…" />;
  }
  if (!user) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return children;
}

/** Login/registration pages: signed-in users skip straight to their home. */
export function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <PageLoader label="Loading…" />;
  }
  if (user) {
    return <Navigate to={homePathFor(user.role)} replace />;
  }
  return children;
}
