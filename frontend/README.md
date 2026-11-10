# Buddy Elder Companion: Frontend

React 18 (Create React App) single-page app for elders, buddies and admins. It talks to the Spring Boot backend in `../backend` over REST (JWT) and WebSocket (STOMP). See the [root README](../README.md) for the full project, features and how to run everything.

## Quick start

```bash
cp .env.example .env.local   # optional: Google Maps key
npm install
npm start                    # http://localhost:3000 (needs the backend on :8080)
npm run build                # production bundle in build/
```

## Structure

```
src/
  api/          axios client (JWT attach + single-flight refresh), endpoint modules
  auth/         AuthContext, ProtectedRoute / GuestOnly, login pages
  hooks/        useBookingChannel (STOMP chat + live location), useUnreadCount
  components/   Header, BottomNavBar, BuddyCard, LiveTracking, ui/ (shared kit)
  pages/        Home, Book, Bookings, BookingDetail, ChatRoom, Nearby, Sos, Care,
                Wallet, Notifications, BuddyDashboard, Admin, ...
  styles/ui.css shared design tokens/classes (all prefixed `ui-`)
  utils/        formatting helpers and role-based navigation config
```

## Conventions

- Screens use the shared `ui-` kit and match the existing look: `#f8f9fa` canvas, white 16px cards, `#667eea → #764ba2` gradient, emoji icons.
- Routes are role-guarded in `src/App.js`; `/home` is the elder home, buddies land on `/buddy-dashboard`, admins on `/admin`.
- Environment variables (`REACT_APP_*`) are inlined into the browser bundle, so never put real secrets in them. Restrict any Maps key by HTTP referrer.
