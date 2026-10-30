package org.ic.comms.bot.wiki;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.ic.comms.config.IcProperties;

public class WikiClient {

    private static final int ATTEMPTS = 2;

    private final HttpClient http;
    private final ObjectMapper mapper;
    private final IcProperties.Wiki config;
    private final Cache<String, List<String>> searches;
    private final Cache<String, Optional<WikiPage>> pages;

    public WikiClient(HttpClient http, ObjectMapper mapper, IcProperties.Wiki config) {
        this.http = http;
        this.mapper = mapper;
        this.config = config;
        this.searches = Caffeine.newBuilder()
                .maximumSize(config.cacheSize())
                .expireAfterWrite(config.cacheTtl())
                .build();
        this.pages = Caffeine.newBuilder()
                .maximumSize(config.cacheSize())
                .expireAfterWrite(config.cacheTtl())
                .build();
    }

    public List<String> search(String query, int limit) {
        String key = query.toLowerCase(Locale.ROOT) + '|' + limit;
        return searches.get(key, k -> {
            JsonNode root = get(Map.of(
                    "list", "search",
                    "srsearch", query,
                    "srlimit", Integer.toString(limit),
                    "srprop", ""));
            List<String> titles = titles(root.path("query").path("search"));
            if (titles.isEmpty()) {
                titles = titles(get(Map.of(
                        "list", "prefixsearch",
                        "pssearch", query,
                        "pslimit", Integer.toString(limit))).path("query").path("prefixsearch"));
            }
            return titles;
        });
    }

    private static List<String> titles(JsonNode hits) {
        List<String> titles = new ArrayList<>();
        hits.forEach(hit -> titles.add(hit.path("title").asText()));
        return List.copyOf(titles);
    }

    public Optional<WikiPage> page(String title) {
        return pages.get(title, k -> {
            JsonNode root = get(Map.of(
                    "prop", "extracts|info",
                    "inprop", "url",
                    "explaintext", "1",
                    "redirects", "1",
                    "titles", title));
            JsonNode page = root.path("query").path("pages").path(0);
            if (page.isMissingNode() || page.has("missing") || page.path("extract").asText().isBlank()) {
                return Optional.empty();
            }
            String resolvedTitle = page.path("title").asText(title);
            String url = page.path("fullurl").asText(articleUrl(resolvedTitle));
            return Optional.of(new WikiPage(resolvedTitle, url, page.path("extract").asText()));
        });
    }

    public Optional<String> randomTitle() {
        JsonNode root = get(Map.of("list", "random", "rnnamespace", "0", "rnlimit", "1"));
        JsonNode first = root.path("query").path("random").path(0);
        return first.isMissingNode() ? Optional.empty() : Optional.of(first.path("title").asText());
    }

    public String articleUrl(String title) {
        return config.articleBaseUrl()
                + URLEncoder.encode(title.replace(' ', '_'), StandardCharsets.UTF_8).replace("+", "%20");
    }

    private JsonNode get(Map<String, String> params) {
        String query = params.entrySet().stream()
                .map(e -> e.getKey() + '=' + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&", "action=query&format=json&formatversion=2&", ""));
        HttpRequest request = HttpRequest.newBuilder(URI.create(config.apiUrl() + "?" + query))
                .timeout(config.timeout())
                .header("User-Agent", config.userAgent())
                .header("Accept", "application/json")
                .GET()
                .build();
        IOException failure = null;
        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            try {
                HttpResponse<byte[]> response = http.send(request, HttpResponse.BodyHandlers.ofByteArray());
                if (response.statusCode() != 200) {
                    throw new WikiUnavailableException("Wiki responded with HTTP " + response.statusCode());
                }
                return mapper.readTree(response.body());
            } catch (IOException e) {
                failure = e;
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new WikiUnavailableException("Wiki request interrupted", e);
            }
        }
        throw new WikiUnavailableException("Wiki request failed: " + describe(failure), failure);
    }

    private static String describe(Throwable error) {
        Throwable root = error;
        while (root.getCause() != null) {
            root = root.getCause();
        }
        return root.getClass().getSimpleName() + (root.getMessage() == null ? "" : " " + root.getMessage());
    }
}
