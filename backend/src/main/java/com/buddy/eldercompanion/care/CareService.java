package com.buddy.eldercompanion.care;

import com.buddy.eldercompanion.care.dto.CarePlanResponse;
import com.buddy.eldercompanion.care.dto.CreateCarePlanRequest;
import com.buddy.eldercompanion.care.dto.CreateReminderRequest;
import com.buddy.eldercompanion.care.dto.ReminderResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import com.buddy.eldercompanion.notification.NotificationEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Manages one-off reminders and recurring care plans, and runs the scheduled
 * sweeper that fires due notifications. Due care plans advance their next run
 * time by cadence so they recur.
 */
@Service
public class CareService {

    private final ReminderRepository reminderRepository;
    private final CarePlanRepository carePlanRepository;
    private final ApplicationEventPublisher eventPublisher;

    public CareService(ReminderRepository reminderRepository,
                       CarePlanRepository carePlanRepository,
                       ApplicationEventPublisher eventPublisher) {
        this.reminderRepository = reminderRepository;
        this.carePlanRepository = carePlanRepository;
        this.eventPublisher = eventPublisher;
    }

    // ----- Reminders -----

    @Transactional
    public ReminderResponse createReminder(UUID elderId, CreateReminderRequest request) {
        Reminder reminder = Reminder.builder()
                .elderId(elderId)
                .type(request.type())
                .message(request.message())
                .remindAt(request.remindAt())
                .sent(false)
                .build();
        return ReminderResponse.from(reminderRepository.save(reminder));
    }

    @Transactional(readOnly = true)
    public PageResponse<ReminderResponse> listReminders(UUID elderId, Pageable pageable) {
        return PageResponse.from(
                reminderRepository.findByElderIdOrderByRemindAtDesc(elderId, pageable),
                ReminderResponse::from);
    }

    @Transactional
    public void deleteReminder(UUID elderId, UUID reminderId) {
        Reminder r = reminderRepository.findByIdAndElderId(reminderId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("Reminder not found"));
        reminderRepository.delete(r);
    }

    // ----- Care plans -----

    @Transactional
    public CarePlanResponse createCarePlan(UUID elderId, CreateCarePlanRequest request) {
        CarePlan plan = CarePlan.builder()
                .elderId(elderId)
                .title(request.title())
                .cadence(request.cadence())
                .nextRunAt(request.firstRunAt())
                .active(true)
                .build();
        return CarePlanResponse.from(carePlanRepository.save(plan));
    }

    @Transactional(readOnly = true)
    public List<CarePlanResponse> listCarePlans(UUID elderId) {
        return carePlanRepository.findByElderId(elderId).stream()
                .map(CarePlanResponse::from)
                .toList();
    }

    @Transactional
    public void deactivateCarePlan(UUID elderId, UUID planId) {
        CarePlan plan = carePlanRepository.findByIdAndElderId(planId, elderId)
                .orElseThrow(() -> new ResourceNotFoundException("Care plan not found"));
        plan.setActive(false);
        carePlanRepository.save(plan);
    }

    // ----- Scheduled sweeper -----

    /**
     * Fires notifications for due reminders and care plans. Returns the number of
     * notifications fired (handy for tests and metrics).
     */
    @Transactional
    public int sweep() {
        Instant now = Instant.now();
        int fired = 0;

        List<Reminder> dueReminders = reminderRepository.findBySentFalseAndRemindAtLessThanEqual(now);
        for (Reminder r : dueReminders) {
            eventPublisher.publishEvent(new NotificationEvent(
                    r.getElderId(), "REMINDER_" + r.getType().name(),
                    "Reminder: " + r.getType().name().toLowerCase(), r.getMessage(), r.getId()));
            r.setSent(true);
            fired++;
        }
        reminderRepository.saveAll(dueReminders);

        List<CarePlan> duePlans = carePlanRepository.findByActiveTrueAndNextRunAtLessThanEqual(now);
        for (CarePlan p : duePlans) {
            eventPublisher.publishEvent(new NotificationEvent(
                    p.getElderId(), "CARE_PLAN", "Care plan due: " + p.getTitle(),
                    "Recurring care: " + p.getTitle(), p.getId()));
            p.setNextRunAt(p.getCadence().advance(p.getNextRunAt()));
            fired++;
        }
        carePlanRepository.saveAll(duePlans);

        return fired;
    }

    @Scheduled(fixedDelayString = "${app.care.sweep-interval-ms:30000}")
    public void scheduledSweep() {
        sweep();
    }
}
