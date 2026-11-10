-- Phase 2: Core domain — elder and buddy profiles.
-- Each profile is a 1:1 extension of a user account, keyed by the user id.
-- Buddy geo-location columns are added in Phase 4 (geo matching).

CREATE TABLE elder_profiles (
    user_id          UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bio              VARCHAR(1000),
    date_of_birth    DATE,
    medical_notes    VARCHAR(2000),
    preferred_language VARCHAR(50),
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE buddy_profiles (
    user_id            UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    bio                VARCHAR(1000),
    skills             VARCHAR(500),
    hourly_rate        NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (hourly_rate >= 0),
    years_experience   INT          NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
    available          BOOLEAN      NOT NULL DEFAULT TRUE,
    -- Aggregate rating maintained by the reviews feature (Phase 6).
    rating_average     NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count       INT          NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    created_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_buddy_profiles_available ON buddy_profiles (available);
