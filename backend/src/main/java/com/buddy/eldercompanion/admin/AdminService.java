package com.buddy.eldercompanion.admin;

import com.buddy.eldercompanion.admin.dto.AdminUserResponse;
import com.buddy.eldercompanion.admin.dto.BuddyVerificationResponse;
import com.buddy.eldercompanion.admin.dto.VerificationDecisionRequest;
import com.buddy.eldercompanion.booking.Booking;
import com.buddy.eldercompanion.booking.BookingRepository;
import com.buddy.eldercompanion.booking.dto.BookingResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.notification.NotificationEvent;
import com.buddy.eldercompanion.profile.BuddyProfile;
import com.buddy.eldercompanion.profile.BuddyProfileRepository;
import com.buddy.eldercompanion.profile.VerificationStatus;
import com.buddy.eldercompanion.user.UserDirectory;
import com.buddy.eldercompanion.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin dashboards (read) and the buddy verification workflow. Every state-
 * changing admin action writes an {@link AuditLog} entry.
 */
@Service
public class AdminService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final BuddyProfileRepository buddyProfileRepository;
    private final AuditLogRepository auditLogRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final UserDirectory userDirectory;

    public AdminService(UserRepository userRepository,
                        BookingRepository bookingRepository,
                        BuddyProfileRepository buddyProfileRepository,
                        AuditLogRepository auditLogRepository,
                        ApplicationEventPublisher eventPublisher,
                        UserDirectory userDirectory) {
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.buddyProfileRepository = buddyProfileRepository;
        this.auditLogRepository = auditLogRepository;
        this.eventPublisher = eventPublisher;
        this.userDirectory = userDirectory;
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> listUsers(Pageable pageable) {
        return PageResponse.from(userRepository.findAll(pageable), AdminUserResponse::from);
    }

    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listBookings(Pageable pageable) {
        Page<Booking> page = bookingRepository.findAll(pageable);
        List<UUID> ids = new ArrayList<>();
        page.getContent().forEach(b -> {
            ids.add(b.getElderId());
            ids.add(b.getBuddyId());
        });
        Map<UUID, String> names = userDirectory.names(ids);
        return PageResponse.from(page, b -> BookingResponse.from(b)
                .withNames(names.get(b.getElderId()), names.get(b.getBuddyId())));
    }

    @Transactional(readOnly = true)
    public PageResponse<BuddyVerificationResponse> listPendingVerifications(Pageable pageable) {
        Page<BuddyProfile> page =
                buddyProfileRepository.findByVerificationStatus(VerificationStatus.PENDING, pageable);
        Map<UUID, String> names = userDirectory.names(
                page.getContent().stream().map(BuddyProfile::getUserId).toList());
        return PageResponse.from(page, p -> BuddyVerificationResponse.from(p, names.get(p.getUserId())));
    }

    @Transactional
    public BuddyVerificationResponse decideVerification(UUID adminId, UUID buddyUserId,
                                                        VerificationDecisionRequest request) {
        BuddyProfile profile = buddyProfileRepository.findById(buddyUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Buddy profile not found"));
        VerificationStatus newStatus = request.approve()
                ? VerificationStatus.APPROVED : VerificationStatus.REJECTED;
        profile.setVerificationStatus(newStatus);
        profile.setVerificationNote(request.note());
        buddyProfileRepository.save(profile);

        auditLogRepository.save(AuditLog.builder()
                .actorId(adminId)
                .action("BUDDY_VERIFICATION_" + newStatus.name())
                .targetType("BUDDY_PROFILE")
                .targetId(buddyUserId)
                .detail(request.note())
                .build());

        // Notify the buddy of the decision.
        eventPublisher.publishEvent(new NotificationEvent(
                buddyUserId,
                "VERIFICATION_" + newStatus.name(),
                "Your verification was " + newStatus.name().toLowerCase(),
                request.note(),
                buddyUserId));

        return BuddyVerificationResponse.from(profile, userDirectory.name(buddyUserId));
    }

    @Transactional(readOnly = true)
    public PageResponse<AuditLogResponse> myAuditLog(UUID adminId, Pageable pageable) {
        return PageResponse.from(
                auditLogRepository.findByActorIdOrderByCreatedAtDesc(adminId, pageable),
                AuditLogResponse::from);
    }
}
