package com.buddy.eldercompanion.sos;

import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.BusinessRuleException;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.notification.NotificationEvent;
import com.buddy.eldercompanion.sos.dto.EmergencyContactRequest;
import com.buddy.eldercompanion.sos.dto.EmergencyContactResponse;
import com.buddy.eldercompanion.sos.dto.SosAlertResponse;
import com.buddy.eldercompanion.sos.dto.TriggerSosRequest;
import com.buddy.eldercompanion.user.Role;
import com.buddy.eldercompanion.user.User;
import com.buddy.eldercompanion.user.UserRepository;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Emergency contacts management and one-tap SOS. Raising an SOS persists an
 * alert and fans out notifications to the elder (confirmation), every admin, and
 * each registered emergency contact (via the notification/outbox pipeline).
 */
@Service
public class SosService {

    private final EmergencyContactRepository contactRepository;
    private final SosAlertRepository alertRepository;
    private final UserRepository userRepository;
    private final ApplicationEventPublisher eventPublisher;

    public SosService(EmergencyContactRepository contactRepository,
                      SosAlertRepository alertRepository,
                      UserRepository userRepository,
                      ApplicationEventPublisher eventPublisher) {
        this.contactRepository = contactRepository;
        this.alertRepository = alertRepository;
        this.userRepository = userRepository;
        this.eventPublisher = eventPublisher;
    }

    // ----- Emergency contacts -----

    @Transactional
    public EmergencyContactResponse addContact(UUID elderId, EmergencyContactRequest request) {
        EmergencyContact contact = EmergencyContact.builder()
                .elderId(elderId)
                .name(request.name())
                .phone(request.phone())
                .relationship(request.relationship())
                .build();
        return EmergencyContactResponse.from(contactRepository.save(contact));
    }

    @Transactional(readOnly = true)
    public List<EmergencyContactResponse> listContacts(UUID elderId) {
        return contactRepository.findByElderId(elderId).stream()
                .map(EmergencyContactResponse::from)
                .toList();
    }

    @Transactional
    public void deleteContact(UUID elderId, UUID contactId) {
        EmergencyContact contact = contactRepository.findByIdAndElderId(contactId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("Emergency contact not found"));
        contactRepository.delete(contact);
    }

    // ----- SOS -----

    @Transactional
    public SosAlertResponse trigger(UUID elderId, TriggerSosRequest request) {
        SosAlert alert = alertRepository.save(SosAlert.builder()
                .elderId(elderId)
                .status(SosStatus.ACTIVE)
                .latitude(request.latitude())
                .longitude(request.longitude())
                .note(request.note())
                .build());

        String locationText = (request.latitude() != null && request.longitude() != null)
                ? " at (" + request.latitude() + ", " + request.longitude() + ")"
                : "";
        String body = "Emergency SOS raised" + locationText
                + (request.note() != null ? ". Note: " + request.note() : "");

        // Confirmation to the elder.
        eventPublisher.publishEvent(new NotificationEvent(
                elderId, "SOS_RAISED", "SOS alert sent", body, alert.getId()));

        // Alert every admin.
        for (User admin : userRepository.findByRole(Role.ADMIN)) {
            eventPublisher.publishEvent(new NotificationEvent(
                    admin.getId(), "SOS_ADMIN_ALERT", "An elder raised an SOS", body, alert.getId()));
        }

        // Alert each emergency contact (external phone -> delivered by the sender).
        List<EmergencyContact> contacts = contactRepository.findByElderId(elderId);
        for (EmergencyContact contact : contacts) {
            eventPublisher.publishEvent(new NotificationEvent(
                    elderId, "SOS_CONTACT_ALERT",
                    "Alerting " + contact.getName() + " (" + contact.getPhone() + ")",
                    body, alert.getId()));
        }

        return SosAlertResponse.from(alert, contacts.size());
    }

    @Transactional
    public SosAlertResponse resolve(UUID elderId, UUID alertId) {
        SosAlert alert = alertRepository.findByIdAndElderId(alertId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("SOS alert not found"));
        if (alert.getStatus() != SosStatus.ACTIVE) {
            throw new BusinessRuleException("Only active alerts can be resolved");
        }
        alert.setStatus(SosStatus.RESOLVED);
        alert.setResolvedAt(Instant.now());
        return SosAlertResponse.from(alertRepository.save(alert), 0);
    }

    @Transactional(readOnly = true)
    public PageResponse<SosAlertResponse> listAlerts(UUID elderId, Pageable pageable) {
        return PageResponse.from(
                alertRepository.findByElderIdOrderByCreatedAtDesc(elderId, pageable),
                a -> SosAlertResponse.from(a, 0));
    }
}
