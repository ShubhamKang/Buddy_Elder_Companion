package com.buddy.eldercompanion.address;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AddressRepository extends JpaRepository<Address, UUID> {

    Page<Address> findByUserId(UUID userId, Pageable pageable);

    Optional<Address> findByIdAndUserId(UUID id, UUID userId);

    long countByUserId(UUID userId);

    /**
     * Clears the primary flag on all of a user's addresses. Used before setting a
     * new primary so the partial unique index is never violated.
     */
    @Modifying
    @Query("update Address a set a.primary = false where a.userId = :userId and a.primary = true")
    void clearPrimaryForUser(@Param("userId") UUID userId);
}
