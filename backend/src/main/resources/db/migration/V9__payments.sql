-- Phase 7: Payments.
-- A payment is linked to a booking and processed through a pluggable provider
-- (sandbox/mock in dev). Idempotency keys prevent double-charging on retries.
-- A per-user wallet with a transaction ledger records captures and refunds.

CREATE TABLE payments (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id       UUID         NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    payer_id         UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    amount           NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency         VARCHAR(3)   NOT NULL DEFAULT 'INR',
    status           VARCHAR(20)  NOT NULL
                        CHECK (status IN ('CREATED', 'AUTHORIZED', 'CAPTURED', 'REFUNDED', 'FAILED')),
    provider         VARCHAR(30)  NOT NULL,
    provider_ref     VARCHAR(100),
    idempotency_key  VARCHAR(100) NOT NULL UNIQUE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_booking ON payments (booking_id);
CREATE INDEX idx_payments_payer ON payments (payer_id);

CREATE TABLE wallets (
    user_id       UUID         PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    balance       NUMERIC(12, 2) NOT NULL DEFAULT 0,
    currency      VARCHAR(3)   NOT NULL DEFAULT 'INR',
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE wallet_transactions (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    payment_id    UUID         REFERENCES payments (id) ON DELETE SET NULL,
    direction     VARCHAR(10)  NOT NULL CHECK (direction IN ('CREDIT', 'DEBIT')),
    amount        NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    type          VARCHAR(30)  NOT NULL,
    description   VARCHAR(255),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions (user_id, created_at);
