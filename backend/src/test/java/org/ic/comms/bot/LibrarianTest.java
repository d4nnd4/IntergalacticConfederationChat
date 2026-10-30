package org.ic.comms.bot;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.ic.comms.bot.wiki.WikiClient;
import org.ic.comms.bot.wiki.WikiPage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class LibrarianTest {

    private static final String QUESTION = "What do the Ahel remember about the Lyran Wars";

    private final WikiClient wiki = mock(WikiClient.class);
    private final Librarian librarian = new Librarian(wiki, new ExtractiveSummarizer());

    @BeforeEach
    void emptyByDefault() {
        when(wiki.search(anyString(), anyInt())).thenReturn(List.of());
        when(wiki.articleUrl(anyString())).thenAnswer(call -> "https://wiki/" + call.getArgument(0));
    }

    @Test
    void triesShorterPhrasesFromTheEndOfTheQuestion() {
        assertThat(Librarian.attempts(QUESTION, Tokenizer.contentTokens(QUESTION))).startsWith(
                QUESTION, "ahel remember lyran wars", "lyran wars", "remember lyran", "ahel remember");
    }

    @Test
    void fallsBackToAPhraseThatMatchesATitle() {
        when(wiki.search(eq("lyran wars"), anyInt())).thenReturn(List.of("Lyran Wars"));
        when(wiki.page("Lyran Wars")).thenReturn(Optional.of(new WikiPage("Lyran Wars", "https://wiki/Lyran_Wars",
                "The Lyran Wars are an alleged ancient conflict that scattered the peoples of Lyra across the galaxy.")));

        Optional<Librarian.Finding> finding = librarian.find(QUESTION, Librarian.Match.BEST_HIT, 2, 400);

        assertThat(finding).map(Librarian.Finding::title).contains("Lyran Wars");
    }

    @Test
    void ignoresFallbackHitsThatDoNotShareAWordWithTheQuestion() {
        when(wiki.search(eq("remember"), anyInt())).thenReturn(List.of("Total Recall"));
        assertThat(librarian.find("remember lyran", Librarian.Match.BEST_HIT, 2, 400)).isEmpty();
    }
}
