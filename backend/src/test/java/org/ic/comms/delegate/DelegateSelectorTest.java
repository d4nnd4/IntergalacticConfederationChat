package org.ic.comms.delegate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.ic.comms.delegate.Fixtures.person;
import static org.ic.comms.delegate.Fixtures.relay;

import java.util.List;

import org.ic.comms.chat.ChatMessage;
import org.ic.comms.profile.Profile;
import org.junit.jupiter.api.Test;

class DelegateSelectorTest {

    private static final double LOW_ROLL = 0.2;

    private final DelegateSelector selector = new DelegateSelector(Fixtures.profiles(), () -> LOW_ROLL);

    @Test
    void namedDelegateAnswers() {
        List<Profile> chosen = selector.choose(person("flavia", "Odun, how is the station today?", 0), List.of());
        assertThat(chosen).extracting(Profile::id).containsExactly("gin");
    }

    @Test
    void neverSpeaksForTheAuthorOrADelegateSomeoneIsPlaying() {
        List<Profile> chosen = selector.choose(
                person("flavia", "Odun? Anyone?", 0),
                List.of(person("gin", "I am here in person", 120)));
        assertThat(chosen).extracting(Profile::id).doesNotContain("flavia", "gin").hasSize(1);
    }

    @Test
    void prefersDelegatesWhoHauntTheChannel() {
        List<Profile> chosen = selector.choose(person("flavia", "Docking went smoothly", 0), List.of());
        assertThat(chosen).extracting(Profile::id).containsExactly("gin");
    }

    @Test
    void rotatesAwayFromTheLastRelayVoice() {
        List<Profile> chosen = selector.choose(
                person("flavia", "Docking went smoothly", 0),
                List.of(relay("gin", "Logged. Calmly.", 30)));
        assertThat(chosen).extracting(Profile::id).doesNotContain("gin").hasSize(1);
    }

    @Test
    void staysQuietWhenOtherPeopleAreTalkingUnlessAsked() {
        List<ChatMessage> earlier = List.of(person("ahel", "Hello Flavia", 30));
        assertThat(selector.choose(person("flavia", "Nice to meet you", 0), earlier)).isEmpty();
        assertThat(selector.choose(person("flavia", "What is Ganymede like?", 0), earlier)).hasSize(1);
    }

    @Test
    void staysQuietWhenEveryDelegateIsClaimed() {
        List<ChatMessage> earlier = Fixtures.profiles().all().stream()
                .map(p -> person(p.id(), "present", 60))
                .toList();
        assertThat(selector.choose(person("flavia", "Anyone there?", 0), earlier)).isEmpty();
    }
}
