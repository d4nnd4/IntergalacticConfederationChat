package org.ic.comms.bot;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.ic.comms.bot.wiki.WikiClient;
import org.ic.comms.bot.wiki.WikiPage;
import org.ic.comms.common.Link;
import org.springframework.stereotype.Service;

@Service
public class Librarian {

    public enum Match {
        BEST_HIT,
        TITLE_OVERLAP
    }

    public record Finding(String title, String url, String summary, List<Link> related) {

        public Link link() {
            return new Link(title, url);
        }
    }

    private static final int SEARCH_LIMIT = 5;
    private static final int PAGES_TRIED = 2;
    private static final int RELATED_LIMIT = 3;
    private static final int MAX_ATTEMPTS = 6;
    private static final int MIN_KEYWORD_LENGTH = 4;

    private final WikiClient wiki;
    private final ExtractiveSummarizer summarizer;

    public Librarian(WikiClient wiki, ExtractiveSummarizer summarizer) {
        this.wiki = wiki;
        this.summarizer = summarizer;
    }

    public Optional<Finding> find(String query, Match match, int sentences, int maxChars) {
        if (query.isBlank()) {
            return Optional.empty();
        }
        List<String> queryTokens = Tokenizer.contentTokens(query);
        List<String> attempts = attempts(query, queryTokens);
        for (int i = 0; i < attempts.size(); i++) {
            boolean exact = i == 0 && match == Match.BEST_HIT;
            List<String> titles = wiki.search(attempts.get(i), SEARCH_LIMIT).stream()
                    .filter(title -> exact || overlaps(title, queryTokens))
                    .toList();
            Optional<Finding> finding = titles.stream()
                    .limit(PAGES_TRIED)
                    .map(wiki::page)
                    .flatMap(Optional::stream)
                    .findFirst()
                    .map(page -> describe(page, queryTokens, titles, sentences, maxChars));
            if (finding.isPresent()) {
                return finding;
            }
        }
        return Optional.empty();
    }

    static List<String> attempts(String query, List<String> tokens) {
        Set<String> attempts = new LinkedHashSet<>();
        attempts.add(query);
        if (tokens.size() > 1) {
            attempts.add(String.join(" ", tokens));
            for (int i = tokens.size() - 2; i >= 0; i--) {
                attempts.add(tokens.get(i) + " " + tokens.get(i + 1));
            }
            tokens.stream()
                    .filter(token -> token.length() >= MIN_KEYWORD_LENGTH)
                    .sorted(Comparator.comparingInt(String::length).reversed())
                    .forEach(attempts::add);
        }
        return attempts.stream().limit(MAX_ATTEMPTS).toList();
    }

    public Optional<Finding> random(int sentences, int maxChars) {
        return wiki.randomTitle()
                .flatMap(wiki::page)
                .map(page -> describe(page, List.of(), List.of(), sentences, maxChars));
    }

    private Finding describe(WikiPage page, List<String> queryTokens, List<String> titles, int sentences,
                             int maxChars) {
        String summary = summarizer.summarize(page.text(), queryTokens, sentences, maxChars);
        List<Link> related = titles.stream()
                .filter(title -> !title.equals(page.title()))
                .limit(RELATED_LIMIT)
                .map(title -> new Link(title, wiki.articleUrl(title)))
                .toList();
        return new Finding(page.title(), page.url(), summary, related);
    }

    private static boolean overlaps(String title, List<String> queryTokens) {
        List<String> titleTokens = Tokenizer.contentTokens(title);
        return queryTokens.stream().anyMatch(titleTokens::contains);
    }
}
