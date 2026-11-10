-- Phase 5: Real-time — persisted chat messages between a booking's participants.
-- Live delivery happens over STOMP WebSocket; messages are also stored here so
-- history survives reconnects and can be fetched via REST.

CREATE TABLE chat_messages (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID         NOT NULL REFERENCES bookings (id) ON DELETE CASCADE,
    sender_id   UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    content     VARCHAR(2000) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_chat_messages_booking ON chat_messages (booking_id, created_at);
