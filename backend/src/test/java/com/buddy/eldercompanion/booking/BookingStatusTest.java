package com.buddy.eldercompanion.booking;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pure unit test of the booking state machine's transition rules.
 */
class BookingStatusTest {

    @Test
    void happyPathTransitionsAreAllowed() {
        assertThat(BookingStatus.REQUESTED.canTransitionTo(BookingStatus.ACCEPTED)).isTrue();
        assertThat(BookingStatus.ACCEPTED.canTransitionTo(BookingStatus.IN_PROGRESS)).isTrue();
        assertThat(BookingStatus.IN_PROGRESS.canTransitionTo(BookingStatus.COMPLETED)).isTrue();
    }

    @Test
    void cancellationAllowedBeforeCompletion() {
        assertThat(BookingStatus.REQUESTED.canTransitionTo(BookingStatus.CANCELLED)).isTrue();
        assertThat(BookingStatus.ACCEPTED.canTransitionTo(BookingStatus.CANCELLED)).isTrue();
        assertThat(BookingStatus.IN_PROGRESS.canTransitionTo(BookingStatus.CANCELLED)).isTrue();
    }

    @Test
    void illegalTransitionsAreRejected() {
        assertThat(BookingStatus.REQUESTED.canTransitionTo(BookingStatus.IN_PROGRESS)).isFalse();
        assertThat(BookingStatus.REQUESTED.canTransitionTo(BookingStatus.COMPLETED)).isFalse();
        assertThat(BookingStatus.COMPLETED.canTransitionTo(BookingStatus.IN_PROGRESS)).isFalse();
        assertThat(BookingStatus.CANCELLED.canTransitionTo(BookingStatus.ACCEPTED)).isFalse();
    }

    @Test
    void terminalStatesHaveNoTransitions() {
        assertThat(BookingStatus.COMPLETED.isTerminal()).isTrue();
        assertThat(BookingStatus.CANCELLED.isTerminal()).isTrue();
        assertThat(BookingStatus.REJECTED.isTerminal()).isTrue();
        assertThat(BookingStatus.REQUESTED.isTerminal()).isFalse();
    }
}
