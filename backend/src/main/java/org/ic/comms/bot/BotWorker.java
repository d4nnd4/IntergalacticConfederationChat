package org.ic.comms.bot;

import org.ic.comms.config.MessagingConfig;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class BotWorker {

    private final Archivist archivist;
    private final RabbitTemplate rabbit;

    public BotWorker(Archivist archivist, RabbitTemplate rabbit) {
        this.archivist = archivist;
        this.rabbit = rabbit;
    }

    @RabbitListener(queues = MessagingConfig.BOT_QUEUE, concurrency = "${ic.bot.concurrency}")
    public void handle(BotQuestion question) {
        BotReply reply = archivist.answer(question.text());
        rabbit.convertAndSend(MessagingConfig.CHAT_EXCHANGE, MessagingConfig.BOT_REPLY_PREFIX + question.sessionId(),
                reply);
    }
}
