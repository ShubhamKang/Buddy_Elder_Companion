-- Phase 2: Core domain — user addresses.
-- A user may have multiple addresses (home, work, etc.). Exactly one may be
-- marked primary; this is enforced in the service layer. Latitude/longitude are
-- stored as plain columns here; PostGIS geography for matching is layered on in
-- Phase 4.

CREATE TABLE addresses (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    label         VARCHAR(50),
    line1         VARCHAR(255) NOT NULL,
    line2         VARCHAR(255),
    city          VARCHAR(100) NOT NULL,
    state         VARCHAR(100),
    postal_code   VARCHAR(20),
    country       VARCHAR(100) NOT NULL DEFAULT 'India',
    latitude      DOUBLE PRECISION,
    longitude     DOUBLE PRECISION,
    is_primary    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_addresses_user ON addresses (user_id);

-- At most one primary address per user.
CREATE UNIQUE INDEX uq_addresses_one_primary_per_user
    ON addresses (user_id)
    WHERE is_primary = TRUE;
