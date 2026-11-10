-- Phase 4: Geo buddy matching.
-- Adds a PostGIS geography point to buddy_profiles for radius/distance queries.
-- We keep plain latitude/longitude columns for easy read/write and derive the
-- geography column from them so application code never has to build WKT.

ALTER TABLE buddy_profiles
    ADD COLUMN latitude   DOUBLE PRECISION,
    ADD COLUMN longitude  DOUBLE PRECISION,
    ADD COLUMN location   GEOGRAPHY(POINT, 4326);

-- Keep the geography column in sync with lat/lng automatically.
CREATE OR REPLACE FUNCTION buddy_profiles_sync_location()
    RETURNS TRIGGER AS $$
BEGIN
    IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    ELSE
        NEW.location := NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_buddy_profiles_sync_location
    BEFORE INSERT OR UPDATE OF latitude, longitude ON buddy_profiles
    FOR EACH ROW
    EXECUTE FUNCTION buddy_profiles_sync_location();

-- Spatial index powering ST_DWithin / ST_Distance queries.
CREATE INDEX idx_buddy_profiles_location ON buddy_profiles USING GIST (location);
