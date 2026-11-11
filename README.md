# 🤝 Buddy Elder Companion

> "Uber for elder care": connects elderly people with verified helper companions (**Buddies**) for errands, company and safety.

A full-stack project: a **Spring Boot** REST + WebSocket backend and a **React** frontend. Everything runs on free, open-source components.

## Features

| Area | What it does |
|---|---|
| 🔐 Auth | JWT access tokens with rotating refresh tokens; `ELDER`, `BUDDY`, `ADMIN` roles |
| 📅 Bookings | Instant or scheduled requests; lifecycle `REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED` (or cancelled/declined) |
| 📍 Nearby search | PostGIS radius search, nearest first |
| 💬 Chat & live tracking | STOMP over WebSocket; the buddy shares live location, the elder follows on a map |
| ⭐ Reviews | Only for completed bookings, with an aggregate buddy rating |
| 💳 Payments | Provider interface with a **sandbox** implementation, wallet ledger, idempotency keys, refunds |
| 🔔 Notifications | Event-driven, transactional outbox, in-app and pluggable email/SMS |
| 🆘 SOS | One-tap alert with location to emergency contacts and admins |
| 🛡️ Admin | Buddy verification workflow, user/booking views, audit log |
| ⏰ Care | Medication/appointment reminders and recurring care plans |

## Repository layout

```
backend/    Spring Boot 3.3 (Java 21), Flyway migrations, Testcontainers tests, Dockerfile
frontend/   React 18 (Create React App) talking to the REST + WebSocket API
docker-compose.yml   PostgreSQL+PostGIS, Redis (and the app, behind the "app" profile)
ROADMAP.md  Phase plan and architecture decisions
```

## Run it

**Prerequisites:** Docker, Node 18+, JDK 21+ (only to run the backend outside Docker).

```bash
# 1. Whole backend stack (Postgres + Redis + API on :8080)
docker compose --profile app up --build

# 2. Frontend (http://localhost:3000)
cd frontend
cp .env.example .env.local        # optional: add a Google Maps key
npm install
npm start
```

- **"port is already allocated"?** Another service on your machine is using a published port
  (commonly Postgres on 5432). Pick a different host port; the app talks to Postgres over Docker's
  internal network, so nothing else changes:
  ```bash
  POSTGRES_HOST_PORT=5433 docker compose --profile app up --build
  # also available: REDIS_HOST_PORT (default 6379) and APP_HOST_PORT (default 8080)
  ```
  If you change `APP_HOST_PORT`, point the frontend at it via `REACT_APP_API_BASE_URL` and
  `REACT_APP_WS_URL` in `frontend/.env.local`.
- API docs (Swagger UI): http://localhost:8080/swagger-ui.html
- Backend tests (need Docker for Testcontainers): `cd backend && ./mvnw test`

Register as an Elder or a Buddy in the app. A bootstrap admin is seeded by migration `V12`:
`admin@buddy.local` / `Admin@12345`. **Change this before any real deployment.**

## Configuration

| Variable | Where | Purpose |
|---|---|---|
| `APP_SECURITY_JWT_SECRET` | backend | Base64 JWT signing key. A dev default exists; **always override in production** |
| `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | backend | PostgreSQL connection |
| `REDIS_HOST`, `REDIS_PORT` | backend | Redis connection |
| `APP_CORS_ALLOWED_ORIGINS` | backend | Comma-separated browser origins allowed to call the API |
| `REACT_APP_API_BASE_URL` | frontend | Backend base URL (default `http://localhost:8080`) |
| `REACT_APP_WS_URL` | frontend | WebSocket endpoint (default `http://localhost:8080/ws`) |
| `REACT_APP_GOOGLE_MAPS_API_KEY` | frontend | Optional; map picker and reverse geocoding. Keep it in `.env.local` and restrict it by referrer in Google Cloud |

## Notes and limitations

- Login is **email + password** (phone OTP would need a paid SMS provider).
- Payments run in **sandbox mode**; no real money moves. A real gateway can be added behind the `PaymentProvider` interface.
- Profile photos are kept client-side only (no object storage yet).
- A booking is accepted by any nearby buddy; the backend has no "book this specific buddy" yet.
- Account deletion has no backend endpoint yet.

## CI

GitHub Actions (`.github/workflows/backend-ci.yml`) builds the backend, runs the Testcontainers suite and builds the Docker image on every pull request touching `backend/`.
