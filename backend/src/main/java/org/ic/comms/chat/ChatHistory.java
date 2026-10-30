package org.ic.comms.chat;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.ic.comms.config.IcProperties;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class ChatHistory {

    private final Map<String, BoundedLog<ChatMessage>> logs;

    public ChatHistory(ChannelCatalog channels, IcProperties properties) {
        int capacity = properties.chat().historySize();
        this.logs = channels.all().stream()
                .collect(Collectors.toUnmodifiableMap(Channel::id, c -> new BoundedLog<>(capacity)));
    }

    @RabbitListener(queues = "#{historyQueue.name}")
    public void record(ChatMessage message) {
        BoundedLog<ChatMessage> log = logs.get(message.channel());
        if (log != null) {
            log.append(message);
        }
    }

    public List<ChatMessage> recent(String channel) {
        BoundedLog<ChatMessage> log = logs.get(channel);
        return log == null ? List.of() : log.snapshot();
    }
}
