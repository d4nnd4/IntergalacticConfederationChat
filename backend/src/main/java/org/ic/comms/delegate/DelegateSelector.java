package org.ic.comms.delegate;

import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;
import java.util.function.DoubleSupplier;

import org.ic.comms.bot.Tokenizer;
import org.ic.comms.chat.ChatMessage;
import org.ic.comms.profile.Profile;
import org.ic.comms.profile.ProfileCatalog;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class DelegateSelector {

    static final Duration CLAIM_WINDOW = Duration.ofMinutes(10);
    static final Duration CROWD_WINDOW = Duration.ofMinutes(2);
    static final int MAX_NAMED_RESPONDERS = 2;
    private static final int HAUNT_WEIGHT = 3;

    private final ProfileCatalog profiles;
    private final DoubleSupplier random;

    @Autowired
    public DelegateSelector(ProfileCatalog profiles) {
        this(profiles, () -> ThreadLocalRandom.current().nextDouble());
    }

    DelegateSelector(ProfileCatalog profiles, DoubleSupplier random) {
        this.profiles = profiles;
        this.random = random;
    }

    public List<Profile> choose(ChatMessage message, List<ChatMessage> earlier) {
        Instant now = message.sentAt();
        Set<String> claimed = claimedBy(earlier, now.minus(CLAIM_WINDOW));
        claimed.add(message.authorId());
        List<Profile> free = profiles.all().stream().filter(p -> !claimed.contains(p.id())).toList();
        if (free.isEmpty()) {
            return List.of();
        }

        List<String> tokens = Tokenizer.contentTokens(message.body());
        List<Profile> named = free.stream().filter(p -> p.matchesAny(tokens)).limit(MAX_NAMED_RESPONDERS).toList();
        if (!named.isEmpty()) {
            return named;
        }

        boolean crowded = earlier.stream().anyMatch(m -> !m.automated()
                && !m.authorId().equals(message.authorId())
                && m.sentAt().isAfter(now.minus(CROWD_WINDOW)));
        if (crowded && !message.body().contains("?")) {
            return List.of();
        }
        return List.of(weightedPick(rotate(free, lastRelayVoice(earlier)), message.channel()));
    }

    private static Set<String> claimedBy(List<ChatMessage> earlier, Instant since) {
        Set<String> claimed = new HashSet<>();
        earlier.stream()
                .filter(m -> !m.automated() && m.sentAt().isAfter(since))
                .forEach(m -> claimed.add(m.authorId()));
        return claimed;
    }

    private static String lastRelayVoice(List<ChatMessage> earlier) {
        for (int i = earlier.size() - 1; i >= 0; i--) {
            if (earlier.get(i).automated()) {
                return earlier.get(i).authorId();
            }
        }
        return null;
    }

    private static List<Profile> rotate(List<Profile> free, String lastVoice) {
        if (free.size() < 2 || lastVoice == null) {
            return free;
        }
        List<Profile> others = free.stream().filter(p -> !p.id().equals(lastVoice)).toList();
        return others.isEmpty() ? free : others;
    }

    private Profile weightedPick(List<Profile> candidates, String channel) {
        int total = candidates.stream().mapToInt(p -> weight(p, channel)).sum();
        double target = random.getAsDouble() * total;
        for (Profile candidate : candidates) {
            target -= weight(candidate, channel);
            if (target < 0) {
                return candidate;
            }
        }
        return candidates.getLast();
    }

    private static int weight(Profile profile, String channel) {
        return profile.haunts(channel) ? HAUNT_WEIGHT : 1;
    }
}
