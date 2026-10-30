package org.ic.comms.bot;

import java.time.Instant;
import java.util.List;

import org.ic.comms.common.Link;

public record BotReply(String id, Intent intent, String text, List<Link> sources, Instant sentAt) {

    public BotReply {
        sources = sources == null ? List.of() : List.copyOf(sources);
    }
}
