package org.ic.comms.bot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.core.io.ClassPathResource;

class IntentClassifierTest {

    private static IntentClassifier classifier;

    @BeforeAll
    static void train() {
        classifier = IntentClassifier.fromTsv(new ClassPathResource("bot/intents.tsv"));
    }

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "hello there, archivist|GREETING",
            "what can you help me with|HELP",
            "thanks so much|THANKS",
            "ok goodbye|FAREWELL",
            "who represents humanity|DELEGATE",
            "surprise me with something|RANDOM",
            "I want to play the game|ARCADE",
            "tell me about the Anunnaki|SEARCH",
            "what is the Galactic Federation|SEARCH"
    })
    void classifiesIntent(String text, Intent expected) {
        assertThat(classifier.classify(text).intent()).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"Zorblax", "Ummo"})
    void unknownVocabularyFallsBackToSearch(String text) {
        IntentClassifier.Prediction prediction = classifier.classify(text);
        assertThat(prediction.intent()).isEqualTo(Intent.SEARCH);
        assertThat(prediction.confidence()).isZero();
    }
}
