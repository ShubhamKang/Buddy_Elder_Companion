package com.buddy.eldercompanion.address;

import com.buddy.eldercompanion.address.dto.AddressRequest;
import com.buddy.eldercompanion.address.dto.AddressResponse;
import com.buddy.eldercompanion.common.PageResponse;
import com.buddy.eldercompanion.common.SecurityUtils;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * CRUD for the authenticated user's addresses. All operations are scoped to the
 * caller; a user can never read or modify another user's addresses.
 */
@RestController
@RequestMapping("/api/v1/addresses")
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Addresses", description = "Manage the current user's addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @Operation(summary = "List the current user's addresses (paginated)")
    @GetMapping
    public PageResponse<AddressResponse> list(Pageable pageable) {
        return addressService.list(SecurityUtils.currentUserId(), pageable);
    }

    @Operation(summary = "Get one of the current user's addresses")
    @GetMapping("/{id}")
    public AddressResponse get(@PathVariable UUID id) {
        return addressService.get(SecurityUtils.currentUserId(), id);
    }

    @Operation(summary = "Create an address for the current user")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AddressResponse create(@Valid @RequestBody AddressRequest request) {
        return addressService.create(SecurityUtils.currentUserId(), request);
    }

    @Operation(summary = "Update one of the current user's addresses")
    @PutMapping("/{id}")
    public AddressResponse update(@PathVariable UUID id, @Valid @RequestBody AddressRequest request) {
        return addressService.update(SecurityUtils.currentUserId(), id, request);
    }

    @Operation(summary = "Delete one of the current user's addresses")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        addressService.delete(SecurityUtils.currentUserId(), id);
    }
}
