package org.ic.comms.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.AnonymousQueue;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.ExchangeBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MessagingConfig {

    public static final String CHAT_EXCHANGE = "ic.chat";
    public static final String CHANNEL_PREFIX = "channel.";
    public static final String BOT_REPLY_PREFIX = "bot.";
    public static final String TYPING_PREFIX = "typing.";
    public static final String DELEGATE_QUEUE = "ic.delegates.inbox";
    public static final String BOT_EXCHANGE = "ic.bot";
    public static final String BOT_QUEUE = "ic.bot.requests";
    public static final String BOT_ROUTING_KEY = "ask";

    private static final int REQUEST_TTL_MS = 30_000;
    private static final int WORK_QUEUE_MAX_LENGTH = 5_000;

    @Bean
    TopicExchange chatExchange() {
        return ExchangeBuilder.topicExchange(CHAT_EXCHANGE).durable(true).build();
    }

    @Bean
    DirectExchange botExchange() {
        return ExchangeBuilder.directExchange(BOT_EXCHANGE).durable(true).build();
    }

    @Bean
    Queue botQueue() {
        return QueueBuilder.durable(BOT_QUEUE)
                .ttl(REQUEST_TTL_MS)
                .maxLength(WORK_QUEUE_MAX_LENGTH)
                .build();
    }

    @Bean
    Binding botBinding(Queue botQueue, DirectExchange botExchange) {
        return BindingBuilder.bind(botQueue).to(botExchange).with(BOT_ROUTING_KEY);
    }

    @Bean
    Queue delegateQueue() {
        return QueueBuilder.durable(DELEGATE_QUEUE)
                .ttl(REQUEST_TTL_MS)
                .maxLength(WORK_QUEUE_MAX_LENGTH)
                .build();
    }

    @Bean
    Binding delegateBinding(Queue delegateQueue, TopicExchange chatExchange) {
        return BindingBuilder.bind(delegateQueue).to(chatExchange).with(CHANNEL_PREFIX + "*");
    }

    @Bean
    AnonymousQueue historyQueue() {
        return new AnonymousQueue();
    }

    @Bean
    Binding historyBinding(AnonymousQueue historyQueue, TopicExchange chatExchange) {
        return BindingBuilder.bind(historyQueue).to(chatExchange).with(CHANNEL_PREFIX + "*");
    }

    @Bean
    MessageConverter messageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }
}
