package com.buddy.eldercompanion.profile;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ElderProfileRepository extends JpaRepository<ElderProfile, UUID> {
}
