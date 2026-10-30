package org.ic.comms.bot;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class ExtractiveSummarizerTest {

    private static final String ARTICLE = """
            The Confederation is an alleged assembly of ancient founder races from several galaxies.
            Its fleet reportedly arrived between Jupiter and Ganymede in October 2021.

            == Hosts ==
            The GIN people serve as diplomatic hosts at the Ganymede station on behalf of the Council of Five.
            Their landing bay is described as having yellow and purple fluorescent lighting.
            Short line.
            """;

    private final ExtractiveSummarizer summarizer = new ExtractiveSummarizer();

    @Test
    void prefersSentencesMentioningTheQuery() {
        String summary = summarizer.summarize(ARTICLE, List.of("gin", "hosts"), 1, 500);
        assertThat(summary).startsWith("The GIN people serve as diplomatic hosts");
    }

    @Test
    void keepsOriginalOrderAndDropsHeadings() {
        String summary = summarizer.summarize(ARTICLE, List.of(), 3, 1000);
        assertThat(summary).doesNotContain("==").doesNotContain("Short line");
        assertThat(summary.indexOf("assembly")).isLessThan(summary.indexOf("fleet"));
    }

    @Test
    void respectsCharacterBudget() {
        String summary = summarizer.summarize(ARTICLE, List.of(), 3, 120);
        assertThat(summary.length()).isLessThanOrEqualTo(120);
        assertThat(summary).isNotBlank();
    }

    @Test
    void doesNotSplitOnAbbreviationsOrInitials() {
        String text = "Jane Roe (born c. 1970s) is an author interviewed by Dr. Smith and J. Allen in 2020. "
                + "She later wrote several books about the subject of her encounters.";
        String summary = summarizer.summarize(text, List.of("roe"), 1, 500);
        assertThat(summary).isEqualTo("Jane Roe (born c. 1970s) is an author interviewed by Dr. Smith and J. Allen in 2020.");
    }

    @Test
    void emptyTextYieldsEmptySummary() {
        assertThat(summarizer.summarize("", List.of("x"), 3, 100)).isEmpty();
    }
}
