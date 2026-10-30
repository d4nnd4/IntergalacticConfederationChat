package org.ic.comms.profile;

import java.util.List;

public record Voice(
        String intro,
        List<String> greetings,
        List<String> thanks,
        List<String> farewells,
        List<String> leads,
        List<String> unknown,
        List<String> smalltalk) {

    public static final Voice SILENT = new Voice("…", List.of("…"), List.of("…"), List.of("…"), List.of("%s:"),
            List.of("…"), List.of("…"));

    public Voice {
        greetings = orSilence(greetings);
        thanks = orSilence(thanks);
        farewells = orSilence(farewells);
        leads = leads == null || leads.isEmpty() ? List.of("%s:") : List.copyOf(leads);
        unknown = orSilence(unknown);
        smalltalk = orSilence(smalltalk);
        intro = intro == null ? "…" : intro;
    }

    private static List<String> orSilence(List<String> lines) {
        return lines == null || lines.isEmpty() ? List.of("…") : List.copyOf(lines);
    }
}
