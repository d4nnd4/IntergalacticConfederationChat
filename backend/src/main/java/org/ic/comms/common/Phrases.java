package org.ic.comms.common;

import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

public final class Phrases {

    private Phrases() {
    }

    public static String pick(List<String> options) {
        if (options.isEmpty()) {
            throw new IllegalArgumentException("No phrases to pick from");
        }
        return options.get(ThreadLocalRandom.current().nextInt(options.size()));
    }
}
