package org.ic.comms.bot;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

public final class Tokenizer {

    private static final Pattern DIACRITICS = Pattern.compile("\\p{M}+");
    private static final Pattern SEPARATORS = Pattern.compile("[^\\p{L}\\p{N}]+");
    private static final Set<String> STOPWORDS = Set.of(
            "a", "about", "an", "and", "any", "anything", "are", "as", "at", "be", "by", "can", "could", "did", "do",
            "does", "for", "from", "has", "have", "how", "i", "in", "into", "is", "it", "its", "me", "more", "my",
            "of", "on", "or", "our", "please", "so", "tell", "than", "that", "the", "their", "them", "there", "these",
            "they", "this", "to", "us", "was", "we", "were", "what", "when", "where", "which", "who", "whom", "why",
            "will", "with", "would", "you", "your", "know", "search", "find", "look", "up", "explain", "describe",
            "define", "information", "info", "archive", "archivist");

    private Tokenizer() {
    }

    public static List<String> tokens(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }
        String folded = DIACRITICS.matcher(Normalizer.normalize(text, Normalizer.Form.NFKD)).replaceAll("");
        return Arrays.stream(SEPARATORS.split(folded.toLowerCase(Locale.ROOT)))
                .filter(token -> !token.isEmpty())
                .toList();
    }

    public static List<String> contentTokens(String text) {
        return tokens(text).stream()
                .filter(token -> token.length() > 1 && !STOPWORDS.contains(token))
                .toList();
    }
}
