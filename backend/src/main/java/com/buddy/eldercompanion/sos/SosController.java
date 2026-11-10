package com.buddy.eldercompanion.sos;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.sos.dto.EmergencyContactRequest;
import com.buddy.eldercompanion.sos.dto.EmergencyContactResponse;
import com.buddy.eldercompanion.sos.dto.SosAlertResponse;
import com.buddy.eldercompanion.sos.dto.TriggerSosRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Emergency contacts and one-tap SOS. All endpoints are elder-only.
 */
@RestController
@RequestMapping("/api/v1/sos")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ELDER')")
@Tag(name = "SOS / Emergency", description = "Emergency contacts and one-tap SOS alerts")
public class SosController {

    private final SosService sosService;

    public SosController(SosService sosService) {
        this.sosService = sosService;
    }

    @Operation(summary = "Add an emergency contact")
    @PostMapping("/contacts")
    @ResponseStatus(HttpStatus.CREATED)
    public EmergencyContactResponse addContact(@Valid @RequestBody EmergencyContactRequest request) {
        return sosService.addContact(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "List emergency contacts")
    @GetMapping("/contacts")
    public List<EmergencyContactResponse> listContacts() {
        return sosService.listContacts(SecurityUtils.currentUserId());
    }

    @Operation(summary = "Delete an emergency contact")
    @DeleteMapping("/contacts/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteContact(@PathVariable UUID id) {
        sosService.deleteContact(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Raise a one-tap SOS alert with live location")
    @PostMapping("/alerts")
    @ResponseStatus(HttpStatus.CREATED)
    public SosAlertResponse trigger(@Valid @RequestBody TriggerSosRequest request) {
        return sosService.trigger(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "Resolve an active SOS alert")
    @PostMapping("/alerts/{id}/resolve")
    public SosAlertResponse resolve(@PathVariable UUID id) {
        return sosService.resolve(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "List the current elder's SOS alerts")
    @GetMapping("/alerts")
    public PageResponse<SosAlertResponse> listAlerts(Pageable pageable) {
        return sosService.listAlerts(SecurityUtils.currentUserId(), pageable);
    }
}
