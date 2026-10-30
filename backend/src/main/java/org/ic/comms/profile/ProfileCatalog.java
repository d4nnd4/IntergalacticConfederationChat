package org.ic.comms.profile;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Component
public class ProfileCatalog {

    private final Map<String, Profile> profiles;

    public ProfileCatalog(ObjectMapper objectMapper, @Value("classpath:profiles.json") Resource source) {
        try (InputStream in = source.getInputStream()) {
            List<Profile> loaded = objectMapper.readValue(in, new TypeReference<>() {
            });
            this.profiles = loaded.stream().collect(Collectors.toMap(
                    Profile::id, Function.identity(), (a, b) -> {
                        throw new IllegalStateException("Duplicate profile id " + a.id());
                    }, LinkedHashMap::new));
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to load profiles", e);
        }
    }

    public Collection<Profile> all() {
        return profiles.values();
    }

    public boolean exists(String id) {
        return id != null && profiles.containsKey(id);
    }

    public Optional<Profile> find(String id) {
        return Optional.ofNullable(id == null ? null : profiles.get(id));
    }

    public Optional<Profile> mentionedIn(List<String> tokens) {
        return profiles.values().stream().filter(p -> p.matchesAny(tokens)).findFirst();
    }
}
