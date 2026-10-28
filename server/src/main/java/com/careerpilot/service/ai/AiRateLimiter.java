package com.careerpilot.service.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * Concurrency-safe sliding window rate limiter per user.
 */
@Component
public class AiRateLimiter {

    private final int maxRequestsPerMinute;
    private final ConcurrentHashMap<UUID, ConcurrentLinkedDeque<Long>> userRequestWindows = new ConcurrentHashMap<>();

    public AiRateLimiter(@Value("${app.ai.rate-limit-per-minute:5}") int maxRequestsPerMinute) {
        this.maxRequestsPerMinute = Math.max(1, maxRequestsPerMinute);
    }

    public synchronized boolean tryAcquire(UUID userId) {
        if (userId == null) {
            return false;
        }

        long now = Instant.now().toEpochMilli();
        long windowStart = now - 60_000L;

        ConcurrentLinkedDeque<Long> timestamps = userRequestWindows.computeIfAbsent(userId, k -> new ConcurrentLinkedDeque<>());

        // Evict expired entries older than 60 seconds
        while (!timestamps.isEmpty() && timestamps.peekFirst() < windowStart) {
            timestamps.pollFirst();
        }

        if (timestamps.size() >= maxRequestsPerMinute) {
            return false;
        }

        timestamps.addLast(now);
        return true;
    }

    public void resetForUser(UUID userId) {
        if (userId != null) {
            userRequestWindows.remove(userId);
        }
    }

    public int getMaxRequestsPerMinute() {
        return maxRequestsPerMinute;
    }
}
