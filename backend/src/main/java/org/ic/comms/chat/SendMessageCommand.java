package org.ic.comms.chat;

public record SendMessageCommand(String channel, String authorId, String body) {
}
