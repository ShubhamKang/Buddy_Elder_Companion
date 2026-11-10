package com.buddy.eldercompanion.profile;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.profile.dto.BuddyProfileRequest;
import com.buddy.eldercompanion.profile.dto.BuddyProfileResponse;
import com.buddy.eldercompanion.profile.dto.ElderProfileRequest;
import com.buddy.eldercompanion.profile.dto.ElderProfileResponse;
import com.buddy.eldercompanion.user.Role;
import com.buddy.eldercompanion.user.User;
import com.buddy.eldercompanion.user.UserDirectory;
import com.buddy.eldercompanion.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;

/**
 * Manages elder and buddy profiles. A profile is created lazily on first update
 * ("upsert"). The caller's role must match the profile type. Buddy responses
 * include the buddy's display name from the user account.
 */
@Service
public class ProfileService {

    private final ElderProfileRepository elderProfileRepository;
    private final BuddyProfileRepository buddyProfileRepository;
    private final UserRepository userRepository;
    private final ProfileMapper profileMapper;
    private final UserDirectory userDirectory;

    public ProfileService(ElderProfileRepository elderProfileRepository,
                          BuddyProfileRepository buddyProfileRepository,
                          UserRepository userRepository,
                          ProfileMapper profileMapper,
                          UserDirectory userDirectory) {
        this.elderProfileRepository = elderProfileRepository;
        this.buddyProfileRepository = buddyProfileRepository;
        this.userRepository = userRepository;
        this.profileMapper = profileMapper;
        this.userDirectory = userDirectory;
    }

    // ----- Elder -----

    @Transactional
    public ElderProfileResponse upsertElderProfile(UUID userId, ElderProfileRequest request) {
        requireRole(userId, Role.ELDER);
        ElderProfile profile = elderProfileRepository.findById(userId)
                .orElseGet(() -> ElderProfile.builder().userId(userId).build());
        profileMapper.updateEntity(request, profile);
        return profileMapper.toResponse(elderProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public ElderProfileResponse getElderProfile(UUID userId) {
        return elderProfileRepository.findById(userId)
                .map(profileMapper::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Elder profile not found"));
    }

    // ----- Buddy -----

    @Transactional
    public BuddyProfileResponse upsertBuddyProfile(UUID userId, BuddyProfileRequest request) {
        requireRole(userId, Role.BUDDY);
        BuddyProfile profile = buddyProfileRepository.findById(userId)
                .orElseGet(() -> BuddyProfile.builder()
                        .userId(userId)
                        .hourlyRate(BigDecimal.ZERO)
                        .ratingAverage(BigDecimal.ZERO)
                        .available(true)
                        .build());
        profileMapper.updateEntity(request, profile);
        return toBuddyResponse(buddyProfileRepository.save(profile));
    }

    @Transactional(readOnly = true)
    public BuddyProfileResponse getBuddyProfile(UUID userId) {
        return buddyProfileRepository.findById(userId)
                .map(this::toBuddyResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Buddy profile not found"));
    }

    @Transactional(readOnly = true)
    public PageResponse<BuddyProfileResponse> listAvailableBuddies(Pageable pageable) {
        Page<BuddyProfile> page = buddyProfileRepository.findByAvailableTrue(pageable);
        Map<UUID, String> names = userDirectory.names(
                page.getContent().stream().map(BuddyProfile::getUserId).toList());
        return PageResponse.from(page,
                p -> profileMapper.toResponse(p).withFullName(names.get(p.getUserId())));
    }

    private BuddyProfileResponse toBuddyResponse(BuddyProfile profile) {
        return profileMapper.toResponse(profile).withFullName(userDirectory.name(profile.getUserId()));
    }

    private void requireRole(UUID userId, Role expected) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (user.getRole() != expected) {
            throw new BusinessRuleException("User role " + user.getRole() + " cannot manage a "
                    + expected + " profile");
        }
    }
}
