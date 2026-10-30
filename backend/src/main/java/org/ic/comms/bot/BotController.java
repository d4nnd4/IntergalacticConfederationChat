package org.ic.comms.bot;

import java.util.regex.Pattern;

import org.ic.comms.chat.SessionRateLimiter;
import org.ic.comms.chat.TextSanitizer;
import org.ic.comms.config.IcProperties;
import org.ic.comms.config.MessagingConfig;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Controller;

@Controller
public class BotController {

    private static final Pattern SESSION_ID = Pattern.compile(
            "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}");

    private final RabbitTemplate rabbit;
    private final SessionRateLimiter rateLimiter;
    private final int maxQuestionLength;

    public BotController(RabbitTemplate rabbit, SessionRateLimiter rateLimiter, IcProperties properties) {
        this.rabbit = rabbit;
        this.rateLimiter = rateLimiter;
        this.maxQuestionLength = properties.bot().maxQuestionLength();
    }

    @MessageMapping("/bot.ask")
    public void ask(@Payload BotQuestion question,
                    @Header(SimpMessageHeaderAccessor.SESSION_ID_HEADER) String sessionId) {
        if (question == null
                || question.sessionId() == null
                || !SESSION_ID.matcher(question.sessionId()).matches()
                || !rateLimiter.tryAcquire(sessionId)) {
            return;
        }
        TextSanitizer.clean(question.text(), maxQuestionLength).ifPresent(text -> rabbit.convertAndSend(
                MessagingConfig.BOT_EXCHANGE, MessagingConfig.BOT_ROUTING_KEY,
                new BotQuestion(question.sessionId(), text)));
    }
}
