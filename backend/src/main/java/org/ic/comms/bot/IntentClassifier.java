package org.ic.comms.bot;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.core.io.Resource;

public final class IntentClassifier {

    public record Example(Intent intent, String text) {
    }

    public record Prediction(Intent intent, double confidence) {

        static final double MIN_CONFIDENCE = 0.45;

        public boolean confident() {
            return confidence >= MIN_CONFIDENCE;
        }

        public Intent intentOr(Intent fallback) {
            return confident() ? intent : fallback;
        }
    }

    private static final double SMOOTHING = 0.1;

    private final Map<Intent, Map<String, Integer>> tokenCounts = new EnumMap<>(Intent.class);
    private final Map<Intent, Integer> tokenTotals = new EnumMap<>(Intent.class);
    private final Map<Intent, Double> logPriors = new EnumMap<>(Intent.class);
    private final Set<String> vocabulary = new HashSet<>();

    public IntentClassifier(List<Example> examples) {
        if (examples.isEmpty()) {
            throw new IllegalArgumentException("At least one training example is required");
        }
        Map<Intent, Integer> documents = new EnumMap<>(Intent.class);
        for (Example example : examples) {
            documents.merge(example.intent(), 1, Integer::sum);
            Map<String, Integer> counts = tokenCounts.computeIfAbsent(example.intent(), i -> new HashMap<>());
            for (String token : Tokenizer.tokens(example.text())) {
                counts.merge(token, 1, Integer::sum);
                tokenTotals.merge(example.intent(), 1, Integer::sum);
                vocabulary.add(token);
            }
        }
        documents.forEach((intent, count) -> logPriors.put(intent, Math.log((double) count / examples.size())));
    }

    public static IntentClassifier fromTsv(Resource resource) {
        List<Example> examples = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                int tab = line.indexOf('\t');
                if (tab > 0) {
                    examples.add(new Example(Intent.valueOf(line.substring(0, tab).strip()), line.substring(tab + 1)));
                }
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Unable to read intent training data", e);
        }
        return new IntentClassifier(examples);
    }

    public Prediction classify(String text) {
        List<String> known = Tokenizer.tokens(text).stream().filter(vocabulary::contains).toList();
        if (known.isEmpty()) {
            return new Prediction(Intent.SEARCH, 0);
        }
        Map<Intent, Double> scores = new EnumMap<>(Intent.class);
        double best = Double.NEGATIVE_INFINITY;
        Intent bestIntent = Intent.SEARCH;
        for (Map.Entry<Intent, Double> prior : logPriors.entrySet()) {
            Intent intent = prior.getKey();
            Map<String, Integer> counts = tokenCounts.get(intent);
            double denominator = tokenTotals.getOrDefault(intent, 0) + SMOOTHING * vocabulary.size();
            double score = prior.getValue();
            for (String token : known) {
                score += Math.log((counts.getOrDefault(token, 0) + SMOOTHING) / denominator);
            }
            scores.put(intent, score);
            if (score > best) {
                best = score;
                bestIntent = intent;
            }
        }
        double max = best;
        double partition = scores.values().stream().mapToDouble(s -> Math.exp(s - max)).sum();
        return new Prediction(bestIntent, 1 / partition);
    }
}
