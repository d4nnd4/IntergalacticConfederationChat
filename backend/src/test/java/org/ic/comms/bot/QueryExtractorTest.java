package org.ic.comms.bot;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class QueryExtractorTest {

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
            "Can you tell me about the Anunnaki?|Anunnaki",
            "who is Elena Danaan|Elena Danaan",
            "search for Ganymede base|Ganymede base",
            "Hey archivist, what is the Intergalactic Confederation please?|Intergalactic Confederation",
            "look up \"Blue Avians\"|Blue Avians",
            "Zeta Reticuli|Zeta Reticuli",
            "what do you know about Oumuamua|Oumuamua"
    })
    void extractsSubject(String question, String expected) {
        assertThat(QueryExtractor.extract(question)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {"'   '", "'?'"})
    void blankInputYieldsBlankQuery(String question) {
        assertThat(QueryExtractor.extract(question)).isBlank();
    }
}
