package org.ic.comms.bot;

import static org.ic.comms.common.Phrases.pick;

import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.ic.comms.bot.wiki.WikiUnavailableException;
import org.ic.comms.common.Link;
import org.ic.comms.config.IcProperties;
import org.ic.comms.profile.Profile;
import org.ic.comms.profile.ProfileCatalog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class Archivist {

    private static final Logger log = LoggerFactory.getLogger(Archivist.class);

    private static final List<String> GREETINGS = List.of(
            "Greetings, delegate. The Ganymede Archive is listening. Ask me about any race, place or event.",
            "Signal received. I index the Ikwipedia records for the Assembly. What shall I look up?",
            "Welcome aboard. Name a being, a world or an incident and I will pull the record.");
    private static final List<String> THANKS = List.of(
            "Glad to be of service. The Archive never closes.",
            "Acknowledged. Ask again whenever the curiosity strikes.",
            "Logged with gratitude. Anything else from the stacks?");
    private static final List<String> FAREWELLS = List.of(
            "End of transmission. Safe orbits, delegate.",
            "Closing the channel. The Archive will keep your seat warm.",
            "Farewell. May your signal stay clear.");
    private static final String HELP = """
            I am the Archivist, a small local model that reads the Ikwipedia records for the Assembly.
            Try things like:
              • Tell me about the Pleiadians
              • What is the Intergalactic Confederation?
              • Who represents Earth?
              • Surprise me
            I classify your intent, search the wiki, and condense the most relevant sentences for you.""";
    private static final String NO_RECORD = "The Archive holds no record matching \"%s\". Try another name or "
            + "spelling; the index skips words shorter than four letters.";
    private static final String ARCADE = "Ringfall is waiting in the third tab. Arrows or WASD to fly, Space to fire, "
            + "X to detonate a ring pulse. Watch your heat gauge.";
    private static final String UNAVAILABLE = "The relay to Ikwipedia is not responding right now. Try again in a moment.";

    private final IntentClassifier classifier;
    private final Librarian librarian;
    private final ProfileCatalog profiles;
    private final IcProperties.Bot config;
    private final Clock clock;

    public Archivist(IntentClassifier classifier, Librarian librarian, ProfileCatalog profiles,
                     IcProperties properties, Clock clock) {
        this.classifier = classifier;
        this.librarian = librarian;
        this.profiles = profiles;
        this.config = properties.bot();
        this.clock = clock;
    }

    public BotReply answer(String question) {
        Intent intent = classifier.classify(question).intentOr(Intent.SEARCH);
        try {
            return switch (intent) {
                case GREETING -> reply(intent, pick(GREETINGS));
                case HELP -> reply(intent, HELP);
                case THANKS -> reply(intent, pick(THANKS));
                case FAREWELL -> reply(intent, pick(FAREWELLS));
                case ARCADE -> reply(intent, ARCADE);
                case RANDOM -> librarian.random(config.summarySentences(), config.summaryMaxChars())
                        .map(this::describe)
                        .orElseGet(() -> reply(Intent.RANDOM, "The random drawer jammed. Ask me again."));
                case DELEGATE -> delegate(question).orElseGet(() -> search(question));
                case SEARCH -> search(question);
            };
        } catch (WikiUnavailableException e) {
            log.warn("Wiki lookup failed: {}", e.getMessage());
            return reply(Intent.SEARCH, UNAVAILABLE);
        }
    }

    private Optional<BotReply> delegate(String question) {
        List<String> tokens = Tokenizer.contentTokens(question);
        Optional<Profile> match = profiles.mentionedIn(tokens);
        if (match.isPresent()) {
            Profile p = match.get();
            String role = p.member() ? "Seated in the Assembly" : "Attends the Assembly as a non-member";
            return Optional.of(reply(Intent.DELEGATE, "%s · %s (%s)%n%s. Origin: %s.%n%n%s"
                    .formatted(p.name(), p.title(), p.race(), role, p.origin(), p.bio())));
        }
        if (tokens.stream().anyMatch(t -> t.startsWith("delegat") || t.startsWith("member"))) {
            String roster = profiles.all().stream()
                    .map(p -> "  • %s (%s) — %s".formatted(p.name(), p.race(), p.title()))
                    .collect(Collectors.joining("\n"));
            return Optional.of(reply(Intent.DELEGATE, "Delegates currently seated:\n" + roster));
        }
        return Optional.empty();
    }

    private BotReply search(String question) {
        String query = QueryExtractor.extract(question);
        if (query.isBlank()) {
            return reply(Intent.HELP, HELP);
        }
        return librarian.find(query, Librarian.Match.BEST_HIT, config.summarySentences(), config.summaryMaxChars())
                .map(this::describe)
                .or(() -> delegate(question))
                .orElseGet(() -> reply(Intent.SEARCH, NO_RECORD.formatted(query)));
    }

    private BotReply describe(Librarian.Finding finding) {
        List<Link> sources = new ArrayList<>();
        sources.add(finding.link());
        sources.addAll(finding.related());
        return new BotReply(UUID.randomUUID().toString(), Intent.SEARCH, finding.title() + "\n\n" + finding.summary(),
                sources, clock.instant());
    }

    private BotReply reply(Intent intent, String text) {
        return new BotReply(UUID.randomUUID().toString(), intent, text, List.of(), clock.instant());
    }
}
