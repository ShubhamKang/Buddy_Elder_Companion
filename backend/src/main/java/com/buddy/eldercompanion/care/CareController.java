package com.buddy.eldercompanion.care;

import com.buddy.eldercompanion.care.dto.CarePlanResponse;
import com.buddy.eldercompanion.care.dto.CreateCarePlanRequest;
import com.buddy.eldercompanion.care.dto.CreateReminderRequest;
import com.buddy.eldercompanion.care.dto.ReminderResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
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
 * Reminders and recurring care plans. All endpoints are elder-only.
 */
@RestController
@RequestMapping("/api/v1/care")
@SecurityRequirement(name = "bearerAuth")
@PreAuthorize("hasRole('ELDER')")
@Tag(name = "Care", description = "Reminders and recurring care plans")
public class CareController {

    private final CareService careService;

    public CareController(CareService careService) {
        this.careService = careService;
    }

    @Operation(summary = "Create a reminder")
    @PostMapping("/reminders")
    @ResponseStatus(HttpStatus.CREATED)
    public ReminderResponse createReminder(@Valid @RequestBody CreateReminderRequest request) {
        return careService.createReminder(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "List reminders")
    @GetMapping("/reminders")
    public PageResponse<ReminderResponse> listReminders(Pageable pageable) {
        return careService.listReminders(SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Delete a reminder")
    @DeleteMapping("/reminders/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteReminder(@PathVariable UUID id) {
        careService.deleteReminder(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Create a recurring care plan")
    @PostMapping("/plans")
    @ResponseStatus(HttpStatus.CREATED)
    public CarePlanResponse createCarePlan(@Valid @RequestBody CreateCarePlanRequest request) {
        return careService.createCarePlan(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "List care plans")
    @GetMapping("/plans")
    public List<CarePlanResponse> listCarePlans() {
        return careService.listCarePlans(SecurityUtils.currentUserId());
    }

    @Operation(summary = "Deactivate a care plan")
    @DeleteMapping("/plans/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deactivateCarePlan(@PathVariable UUID id) {
        careService.deactivateCarePlan(SecurityUtils.currentUserId(), id);
    }
}
