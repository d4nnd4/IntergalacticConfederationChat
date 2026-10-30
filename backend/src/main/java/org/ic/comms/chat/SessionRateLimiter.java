package org.ic.comms.chat;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.LongSupplier;

import org.ic.comms.config.IcProperties;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class SessionRateLimiter {

    private final ConcurrentMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final int capacity;
    private final long refillNanos;
    private final LongSupplier clock;

    @Autowired
    public SessionRateLimiter(IcProperties properties) {
        this(properties.chat().burst(), properties.chat().refillEvery(), System::nanoTime);
    }

    SessionRateLimiter(int capacity, Duration refillEvery, LongSupplier clock) {
        this.capacity = capacity;
        this.refillNanos = refillEvery.toNanos();
        this.clock = clock;
    }

    public boolean tryAcquire(String sessionId) {
        if (sessionId == null) {
            return false;
        }
        long now = clock.getAsLong();
        return buckets.computeIfAbsent(sessionId, id -> new Bucket(capacity, now)).tryTake(now);
    }

    @EventListener
    public void onDisconnect(SessionDisconnectEvent event) {
        buckets.remove(event.getSessionId());
    }

    int trackedSessions() {
        return buckets.size();
    }

    private final class Bucket {

        private double tokens;
        private long lastRefill;

        private Bucket(int tokens, long now) {
            this.tokens = tokens;
            this.lastRefill = now;
        }

        private synchronized boolean tryTake(long now) {
            double refilled = (double) (now - lastRefill) / refillNanos;
            if (refilled > 0) {
                tokens = Math.min(capacity, tokens + refilled);
                lastRefill = now;
            }
            if (tokens < 1) {
                return false;
            }
            tokens -= 1;
            return true;
        }
    }
}
