package org.ic.comms.delegate;

import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.ic.comms.chat.ChatHistory;
import org.ic.comms.chat.ChatMessage;
import org.ic.comms.config.MessagingConfig;
import org.ic.comms.profile.Profile;
import org.ic.comms.profile.ProfileCatalog;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
public class DelegateResponder {

    static final Duration STALE_AFTER = Duration.ofSeconds(20);
    private static final long MIN_TYPING_MS = 1_200;
    private static final long MAX_TYPING_MS = 4_000;
    private static final long TYPING_MS_PER_CHAR = 18;
    private static final long TYPING_BASE_MS = 800;

    private final DelegateSelector selector;
    private final DelegateComposer composer;
    private final ChatHistory history;
    private final ProfileCatalog profiles;
    private final RabbitTemplate rabbit;
    private final ScheduledExecutorService scheduler;
    private final Clock clock;

    public DelegateResponder(DelegateSelector selector, DelegateComposer composer, ChatHistory history,
                             ProfileCatalog profiles, RabbitTemplate rabbit, ScheduledExecutorService delegateScheduler,
                             Clock clock) {
        this.selector = selector;
        this.composer = composer;
        this.history = history;
        this.profiles = profiles;
        this.rabbit = rabbit;
        this.scheduler = delegateScheduler;
        this.clock = clock;
    }

    @RabbitListener(queues = MessagingConfig.DELEGATE_QUEUE, concurrency = "${ic.delegates.concurrency}")
    public void onMessage(ChatMessage message) {
        if (message.automated() || message.sentAt().isBefore(clock.instant().minus(STALE_AFTER))) {
            return;
        }
        List<ChatMessage> earlier = history.recent(message.channel()).stream()
                .filter(m -> !m.id().equals(message.id()))
                .toList();
        List<Profile> speakers = selector.choose(message, earlier);
        if (speakers.isEmpty()) {
            return;
        }
        String authorName = profiles.find(message.authorId()).map(Profile::name).orElse("delegate");
        long started = System.nanoTime();
        long dueMs = 0;
        for (Profile speaker : speakers) {
            announceTyping(message.channel(), speaker);
            DelegateComposer.Line line = composer.compose(speaker, message.body(), authorName);
            dueMs += typingTime(line.body());
            long elapsedMs = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started);
            scheduler.schedule(() -> publish(message.channel(), speaker, line), Math.max(0, dueMs - elapsedMs),
                    TimeUnit.MILLISECONDS);
        }
    }

    static long typingTime(String body) {
        return Math.clamp(TYPING_BASE_MS + TYPING_MS_PER_CHAR * body.length(), MIN_TYPING_MS, MAX_TYPING_MS);
    }

    private void announceTyping(String channel, Profile speaker) {
        rabbit.convertAndSend(MessagingConfig.CHAT_EXCHANGE, MessagingConfig.TYPING_PREFIX + channel,
                new TypingNotice(channel, speaker.id()));
    }

    private void publish(String channel, Profile speaker, DelegateComposer.Line line) {
        ChatMessage reply = ChatMessage.fromRelay(channel, speaker.id(), line.body(), clock.instant(), line.source());
        rabbit.convertAndSend(MessagingConfig.CHAT_EXCHANGE, MessagingConfig.CHANNEL_PREFIX + channel, reply);
    }
}
