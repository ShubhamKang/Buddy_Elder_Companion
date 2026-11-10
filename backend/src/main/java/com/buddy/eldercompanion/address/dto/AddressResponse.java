package com.buddy.eldercompanion.address.dto;

import java.util.UUID;

public record AddressResponse(
        UUID id,
        String label,
        String line1,
        String line2,
        String city,
        String state,
        String postalCode,
        String country,
        Double latitude,
        Double longitude,
        boolean primary
) {
}
