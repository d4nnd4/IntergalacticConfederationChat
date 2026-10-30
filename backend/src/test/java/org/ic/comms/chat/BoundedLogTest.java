package org.ic.comms.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.stream.IntStream;

import org.junit.jupiter.api.Test;

class BoundedLogTest {

    @Test
    void keepsMostRecentItemsInOrder() {
        BoundedLog<Integer> log = new BoundedLog<>(3);
        IntStream.rangeClosed(1, 5).forEach(log::append);
        assertThat(log.snapshot()).containsExactly(3, 4, 5);
    }

    @Test
    void returnsPartialContentsBeforeWrapping() {
        BoundedLog<String> log = new BoundedLog<>(4);
        log.append("a");
        log.append("b");
        assertThat(log.snapshot()).containsExactly("a", "b");
    }

    @Test
    void rejectsNonPositiveCapacity() {
        assertThatThrownBy(() -> new BoundedLog<>(0)).isInstanceOf(IllegalArgumentException.class);
    }
}
