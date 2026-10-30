package org.ic.comms.delegate;

import java.time.Instant;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.ic.comms.chat.ChatMessage;
import org.ic.comms.profile.ProfileCatalog;
import org.springframework.core.io.ClassPathResource;

final class Fixtures {

    static final Instant NOW = Instant.parse("2026-10-30T12:00:00Z");

    private Fixtures() {
    }

    static ProfileCatalog profiles() {
        return new ProfileCatalog(new ObjectMapper(), new ClassPathResource("profiles.json"));
    }

    static ChatMessage person(String author, String body, int secondsAgo) {
        return message(author, body, secondsAgo, false);
    }

    static ChatMessage relay(String author, String body, int secondsAgo) {
        return message(author, body, secondsAgo, true);
    }

    private static ChatMessage message(String author, String body, int secondsAgo, boolean automated) {
        return new ChatMessage(author + "-" + secondsAgo, "ganymede", author, body, NOW.minusSeconds(secondsAgo),
                automated, null);
    }
}
