# 🤝 Buddy Elder Companion

> A React web application that connects elderly people with helper companions (Buddies) — making care accessible, simple, and human.

---

## 🌐 Live Demo

👉 **[Click here to view the live app](https://buddy-9713a.web.app)** ← 


---

## 📖 About the Project

**Buddy Elder Companion** is a full-stack web application designed to bridge the gap between elderly individuals who need assistance and compassionate helpers called **"Buddies"**.

Think of it like **Uber — but for elderly care**. Elders can browse available Buddies nearby, request help instantly, manage their addresses, and maintain their profile — all in one place.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Dual Login System** | Separate login for Elders and Buddies |
| 🏠 **Home Page** | Browse available Buddy cards with details |
| 👤 **Profile Management** | View and edit user profile |
| 📍 **Location Detection** | Auto-detects user location via GPS |
| 🗺️ **Address & Map** | Add and manage addresses with map selection |
| 🆘 **Need Help** | Instant help request feature for elders |
| ⚙️ **Settings** | Personalize app preferences |
| 🛡️ **Error Handling** | Graceful error boundaries across the app |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **React.js** | Frontend UI with component-based architecture |
| **Firebase Authentication** | Secure login & signup system |
| **Firebase Database** | Real-time data storage |
| **React Router** | Client-side page navigation |
| **Browser Geolocation API** | GPS-based location detection |
| **CSS (Component-level)** | Styling for each component |
| **Firebase Hosting** | App deployment & hosting |

---

## 🔄 App Workflow

```
App Starts (index.js)
      ↓
App.js loads all routes
      ↓
Intro / Splash Screen
      ↓
User Logs In (Elder or Buddy)
      ↓
Firebase verifies credentials
      ↓
Home Page loads
      ↓
User can Browse Buddies → View Buddy Info
         ↓
    Request Help (Need Help page)
         ↓
    Manage Location & Addresses
         ↓
    View / Edit Profile & Settings
```
---
