-- Phase 3: Booking lifecycle.
-- A booking is a request from an elder for help, optionally assigned to a buddy.
-- Lifecycle: REQUESTED -> ACCEPTED -> IN_PROGRESS -> COMPLETED, with CANCELLED
-- and REJECTED as terminal states. Type distinguishes instant ("Need Help now")
-- from scheduled bookings.

CREATE TABLE bookings (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id        UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    buddy_id        UUID         REFERENCES users (id) ON DELETE SET NULL,
    status          VARCHAR(20)  NOT NULL
                        CHECK (status IN ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS',
                                          'COMPLETED', 'CANCELLED', 'REJECTED')),
    type            VARCHAR(20)  NOT NULL CHECK (type IN ('INSTANT', 'SCHEDULED')),
    service_notes   VARCHAR(1000),
    scheduled_at    TIMESTAMPTZ,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    cancel_reason   VARCHAR(500),
    -- Address snapshot (bookings must remain stable even if the address changes).
    address_line    VARCHAR(500),
    city            VARCHAR(100),
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bookings_elder ON bookings (elder_id);
CREATE INDEX idx_bookings_buddy ON bookings (buddy_id);
CREATE INDEX idx_bookings_status ON bookings (status);
