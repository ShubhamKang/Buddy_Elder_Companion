// Single source of truth for role-based navigation (header menu, bottom nav,
// settings shortcuts).

export const homePathFor = (role) => {
  if (role === 'BUDDY') return '/buddy-dashboard';
  if (role === 'ADMIN') return '/admin';
  return '/home';
};

const COMMON_TAIL = [
  { icon: '🔔', label: 'Notifications', path: '/notifications' },
  { icon: '💰', label: 'Wallet', path: '/wallet' },
  { icon: '⚙️', label: 'Settings', path: '/settings' },
  { icon: '❓', label: 'Help & Support', path: '/needhelp' },
];

export const menuFor = (role) => {
  if (role === 'BUDDY') {
    return [
      { icon: '📋', label: 'Dashboard', path: '/buddy-dashboard' },
      { icon: '📅', label: 'My Jobs', path: '/bookings' },
      { icon: '📥', label: 'Open Requests', path: '/bookings?tab=open' },
      { icon: '💬', label: 'Messages', path: '/chats' },
      ...COMMON_TAIL,
    ];
  }
  if (role === 'ADMIN') {
    return [
      { icon: '🛡️', label: 'Admin Console', path: '/admin' },
      { icon: '🔔', label: 'Notifications', path: '/notifications' },
      { icon: '⚙️', label: 'Settings', path: '/settings' },
    ];
  }
  return [
    { icon: '🏠', label: 'Home', path: '/home' },
    { icon: '📅', label: 'My Bookings', path: '/bookings' },
    { icon: '➕', label: 'Book a Buddy', path: '/book' },
    { icon: '🔍', label: 'Find Buddies', path: '/nearby' },
    { icon: '💬', label: 'Messages', path: '/chats' },
    { icon: '🆘', label: 'SOS & Emergency', path: '/sos' },
    { icon: '⏰', label: 'Reminders & Care', path: '/care' },
    { icon: '📍', label: 'Saved Addresses', path: '/addresses' },
    ...COMMON_TAIL,
  ];
};

export const bottomNavFor = (role) => {
  if (role === 'BUDDY') {
    return [
      { id: 'dash', label: 'Home', icon: '🏠', path: '/buddy-dashboard' },
      { id: 'jobs', label: 'Jobs', icon: '📅', path: '/bookings' },
      { id: 'open', label: 'Requests', icon: '📥', path: '/bookings?tab=open' },
      { id: 'chat', label: 'Chat', icon: '💬', path: '/chats' },
      { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
    ];
  }
  return [
    { id: 'home', label: 'Home', icon: '🏠', path: '/home' },
    { id: 'search', label: 'Find', icon: '🔍', path: '/nearby' },
    { id: 'book', label: 'Book', icon: '➕', path: '/book' },
    { id: 'chat', label: 'Chat', icon: '💬', path: '/chats' },
    { id: 'profile', label: 'Profile', icon: '👤', path: '/profile' },
  ];
};
