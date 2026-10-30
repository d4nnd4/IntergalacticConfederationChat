package org.ic.comms.chat;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class TextSanitizerTest {

    @Test
    void stripsControlCharactersAndExcessBlankLines() {
        assertThat(TextSanitizer.clean("  hi\u0007 there\r\n\n\n\nfriend  ", 100)).contains("hi there\n\nfriend");
    }

    @Test
    void rejectsBlankAndOversizedText() {
        assertThat(TextSanitizer.clean("   ", 100)).isEmpty();
        assertThat(TextSanitizer.clean(null, 100)).isEmpty();
        assertThat(TextSanitizer.clean("abcdef", 5)).isEmpty();
    }

    @Test
    void countsCodePointsNotChars() {
        assertThat(TextSanitizer.clean("🛸🛸", 2)).contains("🛸🛸");
    }
}
