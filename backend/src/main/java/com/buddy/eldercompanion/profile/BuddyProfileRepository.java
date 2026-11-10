package com.buddy.eldercompanion.profile;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BuddyProfileRepository extends JpaRepository<BuddyProfile, UUID> {

    Page<BuddyProfile> findByAvailableTrue(Pageable pageable);

    Page<BuddyProfile> findByVerificationStatus(VerificationStatus status, Pageable pageable);
}
