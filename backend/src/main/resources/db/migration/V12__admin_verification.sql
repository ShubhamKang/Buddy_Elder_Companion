-- Phase 10: Admin & buddy verification.
-- Seeds a bootstrap ADMIN (admins cannot self-register), adds a KYC/verification
-- workflow to buddy profiles, and an audit log for sensitive admin actions.

-- Bootstrap admin. Password is 'Admin@12345' (BCrypt). CHANGE IN PRODUCTION.
INSERT INTO users (id, email, password_hash, full_name, phone, role, status)
VALUES (
    gen_random_uuid(),
    'admin@buddy.local',
    '$2a$10$bvV0vldRwJ2XmqfMaXoxa.4YMC73F4TEjRPa3LQFf2YcsXs.oukzm',
    'Platform Admin',
    NULL,
    'ADMIN',
    'ACTIVE'
);

-- Buddy KYC/verification workflow.
ALTER TABLE buddy_profiles
    ADD COLUMN verification_status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    ADD COLUMN verification_note   VARCHAR(500);

CREATE INDEX idx_buddy_profiles_verification ON buddy_profiles (verification_status);

-- Audit trail for admin actions.
CREATE TABLE audit_logs (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    action        VARCHAR(80)  NOT NULL,
    target_type   VARCHAR(50),
    target_id     UUID,
    detail        VARCHAR(1000),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_id, created_at DESC);
