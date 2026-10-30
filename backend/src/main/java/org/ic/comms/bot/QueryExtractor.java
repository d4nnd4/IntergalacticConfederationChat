package org.ic.comms.bot;

import java.util.regex.Pattern;

public final class QueryExtractor {

    private static final Pattern ADDRESS = Pattern.compile(
            "^(?:(?:hey|hi|hello|ok|okay|so|please|archivist|archive)\\b[\\s,!.:]*)+",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern REQUEST = Pattern.compile(
            "^(?:(?:can|could|would|will) you\\s+)?(?:please\\s+)?"
                    + "(?:(?:tell|teach|show) me (?:more |something )?(?:about|of|on)"
                    + "|what do you know (?:about|of)"
                    + "|what(?:'s|\\s+is|\\s+are|\\s+was|\\s+were)"
                    + "|who(?:'s|\\s+is|\\s+are|\\s+was|\\s+were)"
                    + "|where(?:'s|\\s+is|\\s+are|\\s+was)"
                    + "|search(?: the archive| ikwipedia)?(?: for)?"
                    + "|look\\s?up|find(?: me)?(?: information| info)?(?: on| about)?"
                    + "|define|explain|describe"
                    + "|info(?:rmation)? (?:on|about)"
                    + "|anything (?:on|about))\\b\\s*",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ARTICLE = Pattern.compile("^(?:the|a|an)\\s+", Pattern.CASE_INSENSITIVE);
    private static final Pattern TRAILING = Pattern.compile("(?:[\\s?!.,]|\\bplease\\b)+$", Pattern.CASE_INSENSITIVE);
    private static final Pattern QUOTES = Pattern.compile("[\"“”'‘’]");
    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private QueryExtractor() {
    }

    public static String extract(String question) {
        if (question == null) {
            return "";
        }
        String query = WHITESPACE.matcher(question.strip()).replaceAll(" ");
        query = ADDRESS.matcher(query).replaceFirst("");
        query = REQUEST.matcher(query).replaceFirst("");
        query = ARTICLE.matcher(query).replaceFirst("");
        query = TRAILING.matcher(query).replaceFirst("");
        return QUOTES.matcher(query).replaceAll("").strip();
    }
}
