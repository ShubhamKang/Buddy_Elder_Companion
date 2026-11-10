-- Phase 9: SOS / Emergency.
-- Elders register emergency contacts and can raise a one-tap SOS alert carrying
-- their live location. Raising an alert fans out notifications to admins and
-- (via the outbox sender) to the elder's emergency contacts.

CREATE TABLE emergency_contacts (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    name          VARCHAR(150) NOT NULL,
    phone         VARCHAR(30)  NOT NULL,
    relationship  VARCHAR(50),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_emergency_contacts_elder ON emergency_contacts (elder_id);

CREATE TABLE sos_alerts (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    status        VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'RESOLVED', 'CANCELLED')),
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    note          VARCHAR(500),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    resolved_at   TIMESTAMPTZ
);

CREATE INDEX idx_sos_alerts_elder ON sos_alerts (elder_id, created_at DESC);
