package org.ic.comms.config;

import java.util.Set;
import java.util.regex.Pattern;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Component
public class InboundDestinationGuard implements ChannelInterceptor {

    static final Set<String> SENDABLE = Set.of("/app/chat.send", "/app/bot.ask");

    private static final Pattern SUBSCRIBABLE = Pattern.compile(
            "^/exchange/" + Pattern.quote(MessagingConfig.CHAT_EXCHANGE)
                    + "/((?:channel|typing)\\.[a-z0-9-]{1,32}|bot\\.[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$");

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        StompCommand command = accessor.getCommand();
        String destination = accessor.getDestination();
        if (command == StompCommand.SEND && (destination == null || !SENDABLE.contains(destination))) {
            throw new MessageDeliveryException("Sending to " + destination + " is not allowed");
        }
        if (command == StompCommand.SUBSCRIBE && (destination == null || !SUBSCRIBABLE.matcher(destination).matches())) {
            throw new MessageDeliveryException("Subscribing to " + destination + " is not allowed");
        }
        return message;
    }
}
