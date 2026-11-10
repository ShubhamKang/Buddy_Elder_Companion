package com.buddy.eldercompanion.sos.dto;

import com.buddy.eldercompanion.sos.EmergencyContact;

import java.util.UUID;

public record EmergencyContactResponse(
        UUID id,
        String name,
        String phone,
        String relationship
) {
    public static EmergencyContactResponse from(EmergencyContact c) {
        return new EmergencyContactResponse(c.getId(), c.getName(), c.getPhone(), c.getRelationship());
    }
}
