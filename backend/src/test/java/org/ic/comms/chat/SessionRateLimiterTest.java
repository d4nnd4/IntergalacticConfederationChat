package org.ic.comms.chat;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;

class SessionRateLimiterTest {

    private final AtomicLong now = new AtomicLong();
    private final SessionRateLimiter limiter = new SessionRateLimiter(2, Duration.ofSeconds(1), now::get);

    @Test
    void allowsBurstThenBlocks() {
        assertThat(limiter.tryAcquire("s1")).isTrue();
        assertThat(limiter.tryAcquire("s1")).isTrue();
        assertThat(limiter.tryAcquire("s1")).isFalse();
    }

    @Test
    void refillsOverTime() {
        limiter.tryAcquire("s1");
        limiter.tryAcquire("s1");
        now.addAndGet(Duration.ofSeconds(1).toNanos());
        assertThat(limiter.tryAcquire("s1")).isTrue();
        assertThat(limiter.tryAcquire("s1")).isFalse();
    }

    @Test
    void tracksSessionsIndependently() {
        limiter.tryAcquire("s1");
        limiter.tryAcquire("s1");
        assertThat(limiter.tryAcquire("s2")).isTrue();
        assertThat(limiter.trackedSessions()).isEqualTo(2);
    }

    @Test
    void rejectsMissingSession() {
        assertThat(limiter.tryAcquire(null)).isFalse();
    }
}
