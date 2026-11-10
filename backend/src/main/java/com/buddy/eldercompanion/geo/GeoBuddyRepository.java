package com.buddy.eldercompanion.geo;

import com.buddy.eldercompanion.profile.BuddyProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

/**
 * Geo queries over buddy profiles using PostGIS. Finds available buddies within
 * a radius of a point, ordered nearest-first, with the distance returned.
 */
public interface GeoBuddyRepository extends JpaRepository<BuddyProfile, UUID> {

    @Query(value = """
            SELECT
                bp.user_id               AS userId,
                u.full_name              AS fullName,
                bp.verification_status   AS verificationStatus,
                bp.bio                   AS bio,
                bp.skills                AS skills,
                bp.hourly_rate           AS hourlyRate,
                bp.years_experience      AS yearsExperience,
                bp.rating_average        AS ratingAverage,
                bp.rating_count          AS ratingCount,
                bp.latitude              AS latitude,
                bp.longitude             AS longitude,
                ST_Distance(
                    bp.location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography
                )                        AS distanceMeters
            FROM buddy_profiles bp
            JOIN users u ON u.id = bp.user_id
            WHERE bp.available = TRUE
              AND bp.location IS NOT NULL
              AND ST_DWithin(
                    bp.location,
                    ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
                    :radiusMeters
                )
            ORDER BY distanceMeters ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<NearbyBuddyProjection> findNearbyAvailable(
            @Param("lat") double lat,
            @Param("lng") double lng,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit);
}
