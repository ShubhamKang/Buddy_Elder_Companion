package com.buddy.eldercompanion.address;

import com.buddy.eldercompanion.address.dto.AddressRequest;
import com.buddy.eldercompanion.address.dto.AddressResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.exception.ResourceNotFoundException;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Manages a user's addresses. Enforces the "one primary address per user" rule
 * and scopes every operation to the owning user.
 */
@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final AddressMapper addressMapper;

    public AddressService(AddressRepository addressRepository, AddressMapper addressMapper) {
        this.addressRepository = addressRepository;
        this.addressMapper = addressMapper;
    }

    @Transactional(readOnly = true)
    public PageResponse<AddressResponse> list(UUID userId, Pageable pageable) {
        return PageResponse.from(addressRepository.findByUserId(userId, pageable), addressMapper::toResponse);
    }

    @Transactional(readOnly = true)
    public AddressResponse get(UUID userId, UUID addressId) {
        return addressMapper.toResponse(require(userId, addressId));
    }

    @Transactional
    public AddressResponse create(UUID userId, AddressRequest request) {
        boolean first = addressRepository.countByUserId(userId) == 0;
        boolean makePrimary = request.primary() || first;
        if (makePrimary) {
            addressRepository.clearPrimaryForUser(userId);
        }
        Address address = Address.builder()
                .userId(userId)
                .label(request.label())
                .line1(request.line1())
                .line2(request.line2())
                .city(request.city())
                .state(request.state())
                .postalCode(request.postalCode())
                .country(request.country())
                .latitude(request.latitude())
                .longitude(request.longitude())
                .primary(makePrimary)
                .build();
        return addressMapper.toResponse(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse update(UUID userId, UUID addressId, AddressRequest request) {
        Address address = require(userId, addressId);
        addressMapper.updateEntity(request, address);
        if (request.primary() && !address.isPrimary()) {
            addressRepository.clearPrimaryForUser(userId);
            address.setPrimary(true);
        }
        return addressMapper.toResponse(addressRepository.save(address));
    }

    @Transactional
    public void delete(UUID userId, UUID addressId) {
        Address address = require(userId, addressId);
        addressRepository.delete(address);
    }

    private Address require(UUID userId, UUID addressId) {
        return addressRepository.findByIdAndUserId(addressId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Address not found"));
    }
}
