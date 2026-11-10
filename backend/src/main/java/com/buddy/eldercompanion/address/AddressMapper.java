package com.buddy.eldercompanion.address;

import com.buddy.eldercompanion.address.dto.AddressRequest;
import com.buddy.eldercompanion.address.dto.AddressResponse;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface AddressMapper {

    AddressResponse toResponse(Address address);

    /**
     * Applies non-null request fields onto an existing entity (partial update).
     * The {@code primary} flag is handled explicitly in the service.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(AddressRequest request, @MappingTarget Address address);
}
