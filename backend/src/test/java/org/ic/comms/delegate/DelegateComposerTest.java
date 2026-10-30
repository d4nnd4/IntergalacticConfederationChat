package org.ic.comms.delegate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.ic.comms.bot.IntentClassifier;
import org.ic.comms.bot.Librarian;
import org.ic.comms.bot.wiki.WikiUnavailableException;
import org.ic.comms.common.Link;
import org.ic.comms.profile.Profile;
import org.ic.comms.profile.ProfileCatalog;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

class DelegateComposerTest {

    private static final IntentClassifier CLASSIFIER = IntentClassifier.fromTsv(new ClassPathResource("bot/intents.tsv"));

    private final ProfileCatalog profiles = Fixtures.profiles();
    private final Librarian librarian = mock(Librarian.class);
    private final DelegateComposer composer = new DelegateComposer(CLASSIFIER, librarian, profiles);
    private final Profile gin = profiles.find("gin").orElseThrow();

    @Test
    void greetsTheAuthorByName() {
        DelegateComposer.Line line = composer.compose(gin, "hello there", "Flavia Dos Santos");
        assertThat(line.body()).contains("Flavia Dos Santos");
        assertThat(line.source()).isNull();
        verifyNoInteractions(librarian);
    }

    @Test
    void citesTheWikiInTheirOwnVoice() {
        Librarian.Finding finding = new Librarian.Finding("Ganymede", "https://wiki/Ganymede",
                "Ganymede is the largest moon.", List.of());
        when(librarian.find(eq("Ganymede"), any(), anyInt(), anyInt())).thenReturn(Optional.of(finding));

        DelegateComposer.Line line = composer.compose(gin, "Odun, what is Ganymede?", "Flavia Dos Santos");

        assertThat(gin.voice().leads()).anySatisfy(lead -> assertThat(line.body()).startsWith(lead.formatted("Ganymede")));
        assertThat(line.body()).endsWith("Ganymede is the largest moon.");
        assertThat(line.source()).isEqualTo(new Link("Ganymede", "https://wiki/Ganymede"));
    }

    @Test
    void admitsWhenTheRecordsAreSilent() {
        when(librarian.find(anyString(), any(), anyInt(), anyInt())).thenReturn(Optional.empty());
        DelegateComposer.Line line = composer.compose(gin, "What is Zorblax?", "Flavia Dos Santos");
        assertThat(gin.voice().unknown()).anySatisfy(u -> assertThat(line.body()).isEqualTo(u.formatted("Zorblax")));
    }

    @Test
    void introducesThemselvesWhenOnlyNamed() {
        DelegateComposer.Line line = composer.compose(gin, "Odun Vael?", "Flavia Dos Santos");
        assertThat(line.body()).isEqualTo(gin.voice().intro());
    }

    @Test
    void fallsBackToSmallTalkWhenTheWikiIsDown() {
        when(librarian.find(anyString(), any(), anyInt(), anyInt())).thenThrow(new WikiUnavailableException("down"));
        DelegateComposer.Line line = composer.compose(gin, "What is Ganymede?", "Flavia Dos Santos");
        assertThat(gin.voice().smalltalk()).contains(line.body());
    }

    @Test
    void stripsOnlyTheSpeakersName() {
        assertThat(DelegateComposer.withoutName("Odun, tell me about Ganymede", gin)).isEqualTo("tell me about Ganymede");
        assertThat(DelegateComposer.withoutName("tell me about Ganymede", gin)).isEqualTo("tell me about Ganymede");
    }

    @Test
    void typingTimeScalesWithLengthWithinBounds() {
        assertThat(DelegateResponder.typingTime("hi")).isEqualTo(1_200);
        assertThat(DelegateResponder.typingTime("x".repeat(100))).isEqualTo(2_600);
        assertThat(DelegateResponder.typingTime("x".repeat(1_000))).isEqualTo(4_000);
    }
}
