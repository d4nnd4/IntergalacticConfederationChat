package org.ic.comms.config;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class InboundDestinationGuardTest {

    private final InboundDestinationGuard guard = new InboundDestinationGuard();

    @ParameterizedTest
    @ValueSource(strings = {
            "/exchange/ic.chat/channel.assembly",
            "/exchange/ic.chat/typing.first-contact",
            "/exchange/ic.chat/bot.0f8fad5b-d9cb-469f-a165-70867728950e"
    })
    void allowsKnownSubscriptions(String destination) {
        assertThatCode(() -> guard.preSend(frame(StompCommand.SUBSCRIBE, destination), null))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/exchange/ic.chat/#", "/exchange/amq.topic/x", "/queue/ic.bot.requests",
            "/exchange/ic.chat/bot.not-a-uuid"})
    void blocksOtherSubscriptions(String destination) {
        assertThatThrownBy(() -> guard.preSend(frame(StompCommand.SUBSCRIBE, destination), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void blocksDirectPublishingToTheBroker() {
        assertThatThrownBy(() -> guard.preSend(frame(StompCommand.SEND, "/exchange/ic.chat/channel.assembly"), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void allowsApplicationSends() {
        assertThatCode(() -> guard.preSend(frame(StompCommand.SEND, "/app/chat.send"), null))
                .doesNotThrowAnyException();
    }

    private static Message<byte[]> frame(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
