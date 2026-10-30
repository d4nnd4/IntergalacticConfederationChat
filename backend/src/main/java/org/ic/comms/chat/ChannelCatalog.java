package org.ic.comms.chat;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.ic.comms.config.IcProperties;
import org.springframework.stereotype.Component;

@Component
public class ChannelCatalog {

    private static final Pattern VALID_ID = Pattern.compile("[a-z0-9-]{1,32}");

    private final Map<String, Channel> channels = new LinkedHashMap<>();

    public ChannelCatalog(IcProperties properties) {
        for (Channel channel : properties.chat().channels()) {
            if (!VALID_ID.matcher(channel.id()).matches()) {
                throw new IllegalStateException("Invalid channel id: " + channel.id());
            }
            channels.put(channel.id(), channel);
        }
    }

    public Collection<Channel> all() {
        return channels.values();
    }

    public boolean exists(String id) {
        return id != null && channels.containsKey(id);
    }
}
