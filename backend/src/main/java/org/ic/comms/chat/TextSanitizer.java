package org.ic.comms.chat;

import java.util.Optional;
import java.util.regex.Pattern;

public final class TextSanitizer {

    private static final Pattern CONTROL = Pattern.compile("[\\p{Cntrl}&&[^\\n]]");
    private static final Pattern EXCESS_NEWLINES = Pattern.compile("\\n{3,}");

    private TextSanitizer() {
    }

    public static Optional<String> clean(String raw, int maxLength) {
        if (raw == null) {
            return Optional.empty();
        }
        String text = raw.replace("\r\n", "\n");
        text = CONTROL.matcher(text).replaceAll("");
        text = EXCESS_NEWLINES.matcher(text).replaceAll("\n\n").strip();
        if (text.isEmpty() || text.codePointCount(0, text.length()) > maxLength) {
            return Optional.empty();
        }
        return Optional.of(text);
    }
}
