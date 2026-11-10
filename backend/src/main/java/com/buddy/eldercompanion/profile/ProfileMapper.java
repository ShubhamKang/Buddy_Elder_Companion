package com.buddy.eldercompanion.profile;

import com.buddy.eldercompanion.profile.dto.BuddyProfileRequest;
import com.buddy.eldercompanion.profile.dto.BuddyProfileResponse;
import com.buddy.eldercompanion.profile.dto.ElderProfileRequest;
import com.buddy.eldercompanion.profile.dto.ElderProfileResponse;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(componentModel = "spring")
public interface ProfileMapper {

    ElderProfileResponse toResponse(ElderProfile profile);

    /** fullName lives on the user account; the service fills it in. */
    @Mapping(target = "fullName", ignore = true)
    BuddyProfileResponse toResponse(BuddyProfile profile);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(ElderProfileRequest request, @MappingTarget ElderProfile profile);

    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void updateEntity(BuddyProfileRequest request, @MappingTarget BuddyProfile profile);
}
