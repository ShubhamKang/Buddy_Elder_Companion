# Buddy Elder Companion — Engineering Roadmap

> "Uber for elderly care." This document is the authoritative phase plan for
> evolving the project from a Firebase-only React app into an industry-grade
> full-stack system with a Spring Boot backend.

## Goals

- Replace Firebase entirely (Auth → JWT, Firestore → PostgreSQL, Storage → S3/MinIO).
- Demonstrate professional backend engineering: layered architecture, versioned
  migrations, DTO mapping, validation, tests, observability, CI, containers.
- Deliver a rich, domain-appropriate feature set suitable as a flagship CV project.

## Architecture Decisions (ADR summary)

| Topic | Decision | Rationale |
|---|---|---|
| Language/Runtime | Java 21 (Spring Boot 3.3.5) | LTS, modern records/pattern matching. Builds/runs on local JDK 24. |
| Build | Maven via `./mvnw` wrapper | No global Maven install required. |
| Database | PostgreSQL + PostGIS | Relational integrity + geo queries for buddy matching. |
| Migrations | Flyway (`ddl-auto: validate`) | Deterministic, reviewable schema evolution. No Hibernate auto-DDL in any env. |
| Cache / Presence | Redis | Session presence, caching, rate limiting. |
| Auth | JWT access + refresh, BCrypt | Stateless, standard, replaces Firebase Auth. |
| Authorization | Role-based: `ELDER`, `BUDDY`, `ADMIN` | Matches the domain. |
| DTO mapping | MapStruct | Compile-time, no reflection overhead. |
| Booking state | Explicit enum-based transition guards | Lightweight, interview-explainable; avoids heavy Spring StateMachine dep. |
| Payments | Provider interface + Razorpay sandbox/mock | India-focused; runs with no real keys in dev. |
| Notifications | Spring events + transactional outbox; log-based dev sender | Reliable, pluggable email/SMS later. |
| Real-time | Spring WebSocket (STOMP) | Live tracking + chat. |
| Testing | JUnit 5 + Testcontainers (Postgres) | Real DB in integration tests. |
| API | REST under `/api/v1`, documented via OpenAPI/Swagger | Versioned, self-documenting. |

## Cost Constraint (hard requirement)

Everything must be **free for production and deployment** — no paid service is
required to run or ship this app. Concrete choices:

- **DB/Cache:** PostgreSQL+PostGIS and Redis are open source; deploy on free tiers
  (Supabase/Neon for Postgres, Railway/Render/Fly.io free plans, or self-hosted Docker).
- **Auth:** self-hosted JWT — no paid auth provider.
- **File storage:** MinIO (self-hosted, S3-compatible, free) or Supabase Storage free tier — not paid AWS S3.
- **Payments:** provider behind an interface; dev/demo uses a mock. Real integration
  uses Razorpay/Stripe **test/sandbox mode** (free) — no paid plan needed.
- **Notifications:** log-based sender in dev; email via free SMTP (e.g. Brevo/Gmail free tier);
  SMS kept optional (no paid SMS gateway required to run).
- **CI/Hosting:** GitHub Actions free tier; container hosting on free plans.

## Phase Plan

Each phase must **compile** and have **green tests** before the next begins.

### Phase 0 — Scaffold (DONE)
Spring Boot skeleton, `PingController`, open security, Flyway baseline
(`V1__baseline.sql`, enables PostGIS), Docker Compose (Postgres + Redis),
actuator/Prometheus, Swagger, global exception handling (`ApiError`,
`GlobalExceptionHandler`).

### Phase 1 — Auth & RBAC
- `User` entity (email, password hash, role, status, timestamps).
- Roles: `ELDER`, `BUDDY`, `ADMIN`.
- JWT access + refresh tokens; BCrypt password hashing.
- Endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`.
- `JwtAuthenticationFilter`, `UserDetailsService`, security lockdown (public vs authenticated).
- OpenAPI bearer security scheme.
- Flyway `V2__users.sql`.
- **Replaces:** Firebase Authentication.

### Phase 2 — Core Domain (Profiles & Addresses)
- `ElderProfile`, `BuddyProfile` (skills, bio, hourly rate, availability), `Address`.
- Repositories, services, DTOs (MapStruct), bean validation, pagination.
- Flyway `V3__profiles.sql`, `V4__addresses.sql`.
- **Replaces:** Firestore documents for users/profiles/addresses.

### Phase 3 — Booking Lifecycle
- `Booking` entity with status enum: `REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED`,
  plus `CANCELLED` / `REJECTED` terminal states.
- Explicit transition guard service (validates allowed transitions, actor role).
- Instant ("Need Help now") vs scheduled bookings.
- Buddy assignment, booking history endpoints.
- Flyway `V5__bookings.sql`.

### Phase 4 — Geo Buddy Matching
- PostGIS `GEOGRAPHY(POINT)` on buddy location / address.
- "Find available buddies within X km" sorted by distance.
- Native/criteria geo queries.
- Flyway `V6__geo.sql`.

### Phase 5 — Real-time (WebSocket + Redis)
- STOMP WebSocket endpoints.
- Live buddy location tracking while en route (per-booking topic).
- Elder ↔ buddy chat (persisted messages + live delivery).
- Redis for presence and pub/sub fan-out.
- Flyway `V7__chat.sql`.

### Phase 6 — Reviews & Ratings
- `Review` tied to a completed booking (verified-booking-only).
- Aggregate buddy rating (avg + count), recompute on new review.
- Flyway `V8__reviews.sql`.

### Phase 7 — Payments
- `PaymentProvider` interface; `MockRazorpayProvider` sandbox impl (no real keys in dev).
- `Wallet` + `Transaction` ledger (double-entry style), idempotency keys on charge.
- Booking → payment linkage, refunds on cancellation.
- Flyway `V9__payments.sql`.

### Phase 8 — Notifications
- Transactional outbox pattern + Spring application events.
- In-app notifications (persisted) + pluggable email/SMS (`LogNotificationSender` in dev).
- Triggered by booking/payment/SOS events.
- Flyway `V10__notifications.sql`, `V11__outbox.sql`.

### Phase 9 — SOS / Emergency
- `EmergencyContact` per elder.
- One-tap SOS: captures live location, alerts all contacts + nearby buddies + admin.
- SOS event feeds the notification pipeline.
- Flyway `V12__sos.sql`.

### Phase 10 — Admin & Buddy Verification
- `ADMIN` role dashboards (read endpoints), buddy KYC/background-check approval workflow
  (`PENDING → APPROVED/REJECTED`), document upload references.
- Audit logging for sensitive admin actions.
- Flyway `V13__verification.sql`, `V14__audit.sql`.

### Phase 11 — Reminders & Recurring Care Plans
- Scheduled jobs (Spring `@Scheduled`) for medication/appointment reminders.
- `CarePlan` / subscription (recurring bookings, e.g. "daily medicine visit").
- Flyway `V15__care_plans.sql`, `V16__reminders.sql`.

### Phase 12 — Ops Hardening
- Multi-stage `Dockerfile`, production `docker-compose`.
- GitHub Actions CI (build + test + Testcontainers).
- Observability polish (metrics, structured logging, correlation IDs).
- Rate limiting, security headers, final review.

### Frontend Migration (parallel/later track)
Migrate React app off the Firebase SDK to the REST + JWT API; integrate new
features (booking UI, live tracking, chat, payments, SOS). Tracked separately so
the backend can progress independently.

## Conventions

- Package root: `com.buddy.eldercompanion`, split by layer/feature
  (`auth`, `user`, `booking`, `geo`, `payment`, ...).
- All list endpoints paginated; all request DTOs validated.
- Every entity change ships with a Flyway migration (never edit an applied migration).
- Every phase adds tests (unit + at least one integration test via Testcontainers).
