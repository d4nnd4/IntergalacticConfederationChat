package org.ic.comms.bot;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

public final class ExtractiveSummarizer {

    private static final Pattern HEADING = Pattern.compile("(?m)^\\s*=+[^=\\n]*=+\\s*$");
    private static final Pattern PARAGRAPHS = Pattern.compile("\\n\\s*\\n|\\n");
    private static final Pattern SENTENCE_BREAK = Pattern.compile("(?<=[.!?][\"”’)]?)\\s+(?=[\"“(]?\\p{Lu})");
    private static final Pattern ABBREVIATION = Pattern.compile(
            "(?:\\b(?:c|ca|dr|mr|mrs|ms|st|vs|jr|sr|no|approx|prof|gen|col|lt|sgt|capt|e\\.g|i\\.e|u\\.s)|\\b\\p{Lu})\\.$",
            Pattern.CASE_INSENSITIVE);
    private static final int MIN_SENTENCE = 30;
    private static final int MAX_SENTENCE = 600;
    private static final double QUERY_WEIGHT = 3.0;
    private static final double LEAD_WEIGHT = 2.5;

    private record Sentence(int index, String text, List<String> tokens) {
    }

    private record Scored(Sentence sentence, double score) {
    }

    public String summarize(String text, Collection<String> queryTokens, int maxSentences, int maxChars) {
        List<Sentence> sentences = split(text);
        if (sentences.isEmpty()) {
            return "";
        }
        Map<String, Integer> frequencies = new HashMap<>();
        sentences.forEach(s -> s.tokens().forEach(t -> frequencies.merge(t, 1, Integer::sum)));
        Set<String> query = new HashSet<>(queryTokens);

        List<Sentence> chosen = sentences.stream()
                .map(s -> new Scored(s, score(s, frequencies, query)))
                .sorted(Comparator.comparingDouble(Scored::score).reversed())
                .limit(maxSentences)
                .map(Scored::sentence)
                .sorted(Comparator.comparingInt(Sentence::index))
                .toList();

        StringBuilder summary = new StringBuilder();
        for (Sentence sentence : chosen) {
            int extra = summary.isEmpty() ? sentence.text().length() : sentence.text().length() + 1;
            if (summary.length() + extra > maxChars) {
                break;
            }
            if (!summary.isEmpty()) {
                summary.append(' ');
            }
            summary.append(sentence.text());
        }
        return summary.isEmpty() ? truncate(chosen.getFirst().text(), maxChars) : summary.toString();
    }

    private static double score(Sentence sentence, Map<String, Integer> frequencies, Set<String> query) {
        if (sentence.tokens().isEmpty()) {
            return 0;
        }
        double salience = 0;
        for (String token : sentence.tokens()) {
            salience += Math.log1p(frequencies.getOrDefault(token, 0));
        }
        double relevance = QUERY_WEIGHT * sentence.tokens().stream().distinct().filter(query::contains).count();
        double lead = LEAD_WEIGHT / (1 + sentence.index());
        return relevance + salience / Math.sqrt(sentence.tokens().size()) + lead;
    }

    private static List<Sentence> split(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String body = HEADING.matcher(text).replaceAll("\n");
        List<Sentence> sentences = new ArrayList<>();
        for (String paragraph : PARAGRAPHS.split(body)) {
            for (String sentence : joinAbbreviations(SENTENCE_BREAK.split(paragraph.strip()))) {
                if (sentence.length() >= MIN_SENTENCE && sentence.length() <= MAX_SENTENCE) {
                    sentences.add(new Sentence(sentences.size(), sentence, Tokenizer.contentTokens(sentence)));
                }
            }
        }
        return sentences;
    }

    private static List<String> joinAbbreviations(String[] fragments) {
        List<String> joined = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String fragment : fragments) {
            if (!current.isEmpty()) {
                current.append(' ');
            }
            current.append(fragment.strip());
            if (!ABBREVIATION.matcher(current).find()) {
                joined.add(current.toString());
                current.setLength(0);
            }
        }
        if (!current.isEmpty()) {
            joined.add(current.toString());
        }
        return joined;
    }

    private static String truncate(String text, int maxChars) {
        if (text.length() <= maxChars) {
            return text;
        }
        int cut = text.lastIndexOf(' ', maxChars - 1);
        return text.substring(0, cut > 0 ? cut : maxChars - 1) + "…";
    }
}
