-- Phase 8: Notifications.
-- In-app notifications are persisted per-user and read over REST. A transactional
-- outbox decouples side-effect delivery (email/SMS) from the triggering
-- transaction: domain events write an outbox row in the same commit, and a
-- scheduled dispatcher later delivers them via a pluggable sender.

CREATE TABLE notifications (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type         VARCHAR(50)  NOT NULL,
    title        VARCHAR(200) NOT NULL,
    body         VARCHAR(1000),
    read         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);

CREATE TABLE outbox_events (
    id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type VARCHAR(50)  NOT NULL,
    aggregate_id   UUID,
    event_type     VARCHAR(50)  NOT NULL,
    payload        VARCHAR(4000) NOT NULL,
    processed      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    processed_at   TIMESTAMPTZ
);

CREATE INDEX idx_outbox_unprocessed ON outbox_events (processed, created_at);
