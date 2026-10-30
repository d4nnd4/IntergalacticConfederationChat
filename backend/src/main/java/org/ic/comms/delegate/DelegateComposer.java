package org.ic.comms.delegate;

import static org.ic.comms.common.Phrases.pick;

import java.util.List;
import java.util.Optional;
import java.util.regex.Pattern;

import org.ic.comms.bot.Intent;
import org.ic.comms.bot.IntentClassifier;
import org.ic.comms.bot.Librarian;
import org.ic.comms.bot.QueryExtractor;
import org.ic.comms.bot.Tokenizer;
import org.ic.comms.bot.wiki.WikiUnavailableException;
import org.ic.comms.common.Link;
import org.ic.comms.profile.Profile;
import org.ic.comms.profile.ProfileCatalog;
import org.ic.comms.profile.Voice;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class DelegateComposer {

    public record Line(String body, Link source) {
    }

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");
    static final int SUMMARY_SENTENCES = 2;
    static final int SUMMARY_MAX_CHARS = 420;
    private static final String HELP = "Ask any of us about a being, a world or an event, or call one of us by name. "
            + "The Archivist in the second tab digs deeper.";
    private static final String ARCADE = "Ringfall is in the third tab. Keep your guns cool and save a pulse for the Warden.";
    private static final Logger log = LoggerFactory.getLogger(DelegateComposer.class);

    private final IntentClassifier classifier;
    private final Librarian librarian;
    private final ProfileCatalog profiles;

    public DelegateComposer(IntentClassifier classifier, Librarian librarian, ProfileCatalog profiles) {
        this.classifier = classifier;
        this.librarian = librarian;
        this.profiles = profiles;
    }

    public Line compose(Profile speaker, String text, String authorName) {
        Voice voice = speaker.voice();
        IntentClassifier.Prediction prediction = classifier.classify(text);
        List<String> tokens = Tokenizer.contentTokens(text);
        try {
            return switch (prediction.intentOr(Intent.SEARCH)) {
                case GREETING -> say(pick(voice.greetings()).formatted(authorName));
                case THANKS -> say(pick(voice.thanks()));
                case FAREWELL -> say(pick(voice.farewells()).formatted(authorName));
                case HELP -> say(speaker.matchesAny(tokens) ? voice.intro() : HELP);
                case ARCADE -> say(ARCADE);
                case DELEGATE -> introduce(speaker, tokens);
                case RANDOM -> librarian.random(SUMMARY_SENTENCES, SUMMARY_MAX_CHARS)
                        .map(finding -> cite(voice, finding))
                        .orElseGet(() -> say(pick(voice.smalltalk())));
                case SEARCH -> research(speaker, text, prediction);
            };
        } catch (WikiUnavailableException e) {
            log.warn("Wiki lookup failed for {}: {}", speaker.id(), e.getMessage());
            return say(pick(voice.smalltalk()));
        }
    }

    private Line introduce(Profile speaker, List<String> tokens) {
        Optional<Profile> other = profiles.all().stream()
                .filter(p -> !p.id().equals(speaker.id()) && p.matchesAny(tokens))
                .findFirst();
        return other.map(p -> say("%s? %s, %s. %s".formatted(p.name(), p.title(), p.race(), p.bio())))
                .orElseGet(() -> say(speaker.voice().intro()));
    }

    private Line research(Profile speaker, String text, IntentClassifier.Prediction prediction) {
        Voice voice = speaker.voice();
        String withoutName = withoutName(text, speaker);
        if (Tokenizer.contentTokens(withoutName).isEmpty() && !withoutName.equals(text)) {
            return say(voice.intro());
        }
        String query = QueryExtractor.extract(withoutName);
        if (Tokenizer.contentTokens(query).isEmpty()) {
            return say(pick(voice.smalltalk()));
        }
        boolean asked = text.contains("?") || prediction.confident();
        Librarian.Match match = asked ? Librarian.Match.BEST_HIT : Librarian.Match.TITLE_OVERLAP;
        return librarian.find(query, match, SUMMARY_SENTENCES, SUMMARY_MAX_CHARS)
                .map(finding -> cite(voice, finding))
                .orElseGet(() -> say(asked ? pick(voice.unknown()).formatted(query) : pick(voice.smalltalk())));
    }

    static String withoutName(String text, Profile speaker) {
        List<String> nameTokens = Tokenizer.contentTokens(speaker.name());
        StringBuilder kept = new StringBuilder();
        boolean removed = false;
        for (String word : WHITESPACE.split(text.strip())) {
            List<String> wordTokens = Tokenizer.tokens(word);
            if (!wordTokens.isEmpty() && nameTokens.containsAll(wordTokens)) {
                removed = true;
                continue;
            }
            if (!kept.isEmpty()) {
                kept.append(' ');
            }
            kept.append(word);
        }
        return removed ? kept.toString() : text;
    }

    private static Line cite(Voice voice, Librarian.Finding finding) {
        return new Line(pick(voice.leads()).formatted(finding.title()) + " " + finding.summary(), finding.link());
    }

    private static Line say(String body) {
        return new Line(body, null);
    }
}
