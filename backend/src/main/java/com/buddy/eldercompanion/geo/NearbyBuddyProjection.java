package com.buddy.eldercompanion.geo;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Projection of a nearby-buddy search result, including the computed distance in
 * metres from the search origin. Populated by a native PostGIS query.
 */
public interface NearbyBuddyProjection {

    UUID getUserId();

    String getFullName();

    String getVerificationStatus();

    String getBio();

    String getSkills();

    BigDecimal getHourlyRate();

    Integer getYearsExperience();

    BigDecimal getRatingAverage();

    Integer getRatingCount();

    Double getLatitude();

    Double getLongitude();

    Double getDistanceMeters();
}
