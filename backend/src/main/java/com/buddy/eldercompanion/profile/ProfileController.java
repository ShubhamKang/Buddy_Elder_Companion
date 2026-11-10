package com.buddy.eldercompanion.profile;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import com.buddy.eldercompanion.profile.dto.BuddyProfileRequest;
import com.buddy.eldercompanion.profile.dto.BuddyProfileResponse;
import com.buddy.eldercompanion.profile.dto.ElderProfileRequest;
import com.buddy.eldercompanion.profile.dto.ElderProfileResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Elder and buddy profile endpoints. Writes are restricted by role; the buddy
 * listing is readable by any authenticated user (e.g. elders browsing buddies).
 */
@RestController
@RequestMapping("/api/v1/profiles")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Profiles", description = "Elder and buddy profile management")
public class ProfileController {

    private final ProfileService profileService;

    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
    }

    @Operation(summary = "Create or update the current elder's profile")
    @PreAuthorize("hasRole('ELDER')")
    @PutMapping("/elder/me")
    public ElderProfileResponse upsertElder(@Valid @RequestBody ElderProfileRequest request) {
        return profileService.upsertElderProfile(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "Get the current elder's profile")
    @PreAuthorize("hasRole('ELDER')")
    @GetMapping("/elder/me")
    public ElderProfileResponse myElderProfile() {
        return profileService.getElderProfile(SecurityUtils.currentUserId());
    }

    @Operation(summary = "Create or update the current buddy's profile")
    @PreAuthorize("hasRole('BUDDY')")
    @PutMapping("/buddy/me")
    public BuddyProfileResponse upsertBuddy(@Valid @RequestBody BuddyProfileRequest request) {
        return profileService.upsertBuddyProfile(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "Get the current buddy's profile")
    @PreAuthorize("hasRole('BUDDY')")
    @GetMapping("/buddy/me")
    public BuddyProfileResponse myBuddyProfile() {
        return profileService.getBuddyProfile(SecurityUtils.currentUserId());
    }

    @Operation(summary = "Get a buddy's public profile by user id")
    @GetMapping("/buddy/{userId}")
    public BuddyProfileResponse buddyProfile(@PathVariable UUID userId) {
        return profileService.getBuddyProfile(userId);
    }

    @Operation(summary = "List available buddies (paginated)")
    @GetMapping("/buddy")
    public PageResponse<BuddyProfileResponse> availableBuddies(Pageable pageable) {
        return profileService.listAvailableBuddies(pageable);
    }
}
