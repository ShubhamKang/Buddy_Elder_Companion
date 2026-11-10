-- Phase 11: Reminders & recurring care plans.
-- One-off reminders (medication/appointment) fire a notification when due.
-- Care plans are recurring: a scheduled sweeper advances next_run_at by the
-- cadence each time it fires.

CREATE TABLE reminders (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type         VARCHAR(30)  NOT NULL CHECK (type IN ('MEDICATION', 'APPOINTMENT', 'GENERAL')),
    message      VARCHAR(500) NOT NULL,
    remind_at    TIMESTAMPTZ  NOT NULL,
    sent         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_due ON reminders (sent, remind_at);

CREATE TABLE care_plans (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    elder_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    title         VARCHAR(200) NOT NULL,
    cadence       VARCHAR(20)  NOT NULL CHECK (cadence IN ('DAILY', 'WEEKLY', 'MONTHLY')),
    next_run_at   TIMESTAMPTZ  NOT NULL,
    active        BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_care_plans_due ON care_plans (active, next_run_at);
