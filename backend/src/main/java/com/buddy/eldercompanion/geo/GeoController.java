package com.buddy.eldercompanion.geo;

import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.geo.dto.LocationUpdateRequest;
import com.buddy.eldercompanion.geo.dto.NearbyBuddyResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Geo endpoints: buddies publish their base location; elders search for nearby
 * available buddies ordered by distance (PostGIS-backed).
 */
@RestController
@RequestMapping("/api/v1/buddies")
@SecurityRequirement(name = "bearerAuth")
@org.springframework.validation.annotation.Validated
@Tag(name = "Geo Matching", description = "Location updates and nearby-buddy search")
public class GeoController {

    private final GeoService geoService;

    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @Operation(summary = "Update the current buddy's location")
    @PreAuthorize("hasRole('BUDDY')")
    @PutMapping("/me/location")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateLocation(@Valid @RequestBody LocationUpdateRequest request) {
        geoService.updateBuddyLocation(SecurityUtils.currentUserId(), request.latitude(), request.longitude());
    }

    @Operation(summary = "Find available buddies near a location, nearest first")
    @GetMapping("/nearby")
    public List<NearbyBuddyResponse> nearby(
            @RequestParam @DecimalMin("-90.0") @DecimalMax("90.0") double lat,
            @RequestParam @DecimalMin("-180.0") @DecimalMax("180.0") double lng,
            @RequestParam(defaultValue = "10") double radiusKm,
            @RequestParam(required = false) Integer limit) {
        return geoService.findNearby(lat, lng, radiusKm, limit);
    }
}
