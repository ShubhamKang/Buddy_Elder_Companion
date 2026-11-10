package com.buddy.eldercompanion.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Buddy-specific profile data, keyed 1:1 by the owning user's id.
 * Aggregate rating fields are maintained by the reviews feature (Phase 6);
 * geo-location columns are added in Phase 4.
 */
@Entity
@Table(name = "buddy_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BuddyProfile {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    private UUID userId;

    @Column
    private String bio;

    @Column
    private String skills;

    @Column(name = "hourly_rate", nullable = false)
    private BigDecimal hourlyRate;

    @Column(name = "years_experience", nullable = false)
    private int yearsExperience;

    @Column(nullable = false)
    private boolean available;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(name = "rating_average", nullable = false)
    private BigDecimal ratingAverage;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @Column(name = "verification_status", nullable = false)
    private VerificationStatus verificationStatus;

    @Column(name = "verification_note")
    private String verificationNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (hourlyRate == null) {
            hourlyRate = BigDecimal.ZERO;
        }
        if (ratingAverage == null) {
            ratingAverage = BigDecimal.ZERO;
        }
        if (verificationStatus == null) {
            verificationStatus = VerificationStatus.PENDING;
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
