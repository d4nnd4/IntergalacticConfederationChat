package org.ic.comms.chat;

import java.time.Clock;
import java.util.Optional;

import org.ic.comms.config.IcProperties;
import org.ic.comms.config.MessagingConfig;
import org.ic.comms.profile.ProfileCatalog;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;

@Service
public class ChatService {

    private final RabbitTemplate rabbit;
    private final ChannelCatalog channels;
    private final ProfileCatalog profiles;
    private final SessionRateLimiter rateLimiter;
    private final int maxMessageLength;
    private final Clock clock;

    public ChatService(RabbitTemplate rabbit, ChannelCatalog channels, ProfileCatalog profiles,
                       SessionRateLimiter rateLimiter, IcProperties properties, Clock clock) {
        this.rabbit = rabbit;
        this.channels = channels;
        this.profiles = profiles;
        this.rateLimiter = rateLimiter;
        this.maxMessageLength = properties.chat().maxMessageLength();
        this.clock = clock;
    }

    public Optional<ChatMessage> post(SendMessageCommand command, String sessionId) {
        if (command == null
                || !channels.exists(command.channel())
                || !profiles.exists(command.authorId())
                || !rateLimiter.tryAcquire(sessionId)) {
            return Optional.empty();
        }
        return TextSanitizer.clean(command.body(), maxMessageLength).map(body -> {
            ChatMessage message = ChatMessage.fromPerson(command.channel(), command.authorId(), body, clock.instant());
            rabbit.convertAndSend(MessagingConfig.CHAT_EXCHANGE, MessagingConfig.CHANNEL_PREFIX + message.channel(),
                    message);
            return message;
        });
    }
}
