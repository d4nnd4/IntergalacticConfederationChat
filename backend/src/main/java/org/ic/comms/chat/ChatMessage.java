package org.ic.comms.chat;

import java.time.Instant;
import java.util.UUID;

import org.ic.comms.common.Link;

public record ChatMessage(String id, String channel, String authorId, String body, Instant sentAt, boolean automated,
                          Link source) {

    public static ChatMessage fromPerson(String channel, String authorId, String body, Instant sentAt) {
        return new ChatMessage(UUID.randomUUID().toString(), channel, authorId, body, sentAt, false, null);
    }

    public static ChatMessage fromRelay(String channel, String authorId, String body, Instant sentAt, Link source) {
        return new ChatMessage(UUID.randomUUID().toString(), channel, authorId, body, sentAt, true, source);
    }
}
