package com.buddy.eldercompanion.user;

import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/**
 * Resolves display names for user ids in batch, so list endpoints can enrich
 * responses with human-readable names using a single query (no N+1).
 */
@Component
public class UserDirectory {

    private final UserRepository userRepository;

    public UserDirectory(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Map<UUID, String> names(Collection<UUID> ids) {
        Map<UUID, String> result = new HashMap<>();
        var wanted = ids.stream().filter(Objects::nonNull).distinct().toList();
        if (wanted.isEmpty()) {
            return result;
        }
        userRepository.findAllById(wanted).forEach(u -> result.put(u.getId(), u.getFullName()));
        return result;
    }

    @Transactional(readOnly = true)
    public String name(UUID id) {
        if (id == null) {
            return null;
        }
        return userRepository.findById(id).map(User::getFullName).orElse(null);
    }
}
