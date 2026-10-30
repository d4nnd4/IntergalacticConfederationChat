package org.ic.comms.profile;

import java.time.Duration;
import java.util.Collection;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profiles")
public class ProfileController {

    private static final CacheControl CACHE = CacheControl.maxAge(Duration.ofHours(1)).cachePublic();

    private final ProfileCatalog catalog;

    public ProfileController(ProfileCatalog catalog) {
        this.catalog = catalog;
    }

    @GetMapping
    public ResponseEntity<Collection<Profile>> list() {
        return ResponseEntity.ok().cacheControl(CACHE).body(catalog.all());
    }
}
