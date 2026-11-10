package com.buddy.eldercompanion.geo;

import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.geo.dto.NearbyBuddyResponse;
import com.buddy.eldercompanion.profile.BuddyProfile;
import com.buddy.eldercompanion.profile.BuddyProfileRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Geo matching: lets buddies publish their location and lets elders find
 * available buddies within a radius, ordered by distance.
 */
@Service
public class GeoService {

    private static final int MAX_RESULTS = 50;
    private static final double MAX_RADIUS_KM = 100.0;

    private final GeoBuddyRepository geoBuddyRepository;
    private final BuddyProfileRepository buddyProfileRepository;

    public GeoService(GeoBuddyRepository geoBuddyRepository,
                      BuddyProfileRepository buddyProfileRepository) {
        this.geoBuddyRepository = geoBuddyRepository;
        this.buddyProfileRepository = buddyProfileRepository;
    }

    @Transactional
    public void updateBuddyLocation(UUID buddyId, double latitude, double longitude) {
        BuddyProfile profile = buddyProfileRepository.findById(buddyId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Buddy profile not found; create a profile before setting location"));
        profile.setLatitude(latitude);
        profile.setLongitude(longitude);
        // The DB trigger syncs the PostGIS geography column from lat/lng.
        buddyProfileRepository.save(profile);
    }

    @Transactional(readOnly = true)
    public List<NearbyBuddyResponse> findNearby(double lat, double lng, double radiusKm, Integer limit) {
        if (radiusKm <= 0 || radiusKm > MAX_RADIUS_KM) {
            throw new BusinessRuleException("radiusKm must be between 0 and " + MAX_RADIUS_KM);
        }
        int cappedLimit = (limit == null || limit <= 0) ? 20 : Math.min(limit, MAX_RESULTS);
        return geoBuddyRepository
                .findNearbyAvailable(lat, lng, radiusKm * 1000.0, cappedLimit)
                .stream()
                .map(NearbyBuddyResponse::from)
                .toList();
    }
}
