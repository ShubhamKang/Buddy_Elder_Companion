-- Baseline migration for Buddy Elder Companion.
-- Phase 0: establishes the schema scaffold and enables required extensions.
-- Domain tables (users, profiles, addresses, help_requests, reviews, notifications)
-- are added in subsequent versioned migrations per phase.

-- PostGIS powers geo-distance buddy matching (Phase 3).
CREATE EXTENSION IF NOT EXISTS postgis;

-- A lightweight table to assert that migrations ran and the DB is reachable.
CREATE TABLE schema_metadata (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    key         VARCHAR(100) NOT NULL UNIQUE,
    value       VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO schema_metadata (key, value)
VALUES ('baseline', 'phase-0');
