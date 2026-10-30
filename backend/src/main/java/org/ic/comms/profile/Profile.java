package org.ic.comms.profile;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;

public record Profile(
        String id,
        String name,
        String race,
        String title,
        String origin,
        String bio,
        String accent,
        boolean member,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) List<String> keywords,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) List<String> haunts,
        @JsonProperty(access = JsonProperty.Access.WRITE_ONLY) Voice voice) {

    public Profile {
        keywords = keywords == null ? List.of() : List.copyOf(keywords);
        haunts = haunts == null ? List.of() : List.copyOf(haunts);
        voice = voice == null ? Voice.SILENT : voice;
    }

    @JsonIgnore
    public boolean matchesAny(List<String> tokens) {
        return tokens.stream().anyMatch(keywords::contains);
    }

    @JsonIgnore
    public boolean haunts(String channel) {
        return haunts.contains(channel);
    }
}
