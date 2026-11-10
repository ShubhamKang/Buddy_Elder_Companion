-- Phase 6: Reviews & ratings.
-- An elder reviews the buddy for a COMPLETED booking. One review per booking
-- (enforced by a unique constraint). The buddy's aggregate rating on
-- buddy_profiles is recomputed whenever a review is written.

CREATE TABLE reviews (
    id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id   UUID         NOT NULL UNIQUE REFERENCES bookings (id) ON DELETE CASCADE,
    reviewer_id  UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    buddy_id     UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating       INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment      VARCHAR(2000),
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_reviews_buddy ON reviews (buddy_id);
