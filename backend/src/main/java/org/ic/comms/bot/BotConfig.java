package org.ic.comms.bot;

import java.net.http.HttpClient;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.ic.comms.bot.wiki.WikiClient;
import org.ic.comms.config.IcProperties;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

@Configuration
public class BotConfig {

    @Bean
    IntentClassifier intentClassifier(@Value("classpath:bot/intents.tsv") Resource trainingData) {
        return IntentClassifier.fromTsv(trainingData);
    }

    @Bean
    ExtractiveSummarizer extractiveSummarizer() {
        return new ExtractiveSummarizer();
    }

    @Bean(destroyMethod = "close")
    HttpClient wikiHttpClient(IcProperties properties) {
        return HttpClient.newBuilder()
                .connectTimeout(properties.wiki().timeout())
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build();
    }

    @Bean
    WikiClient wikiClient(HttpClient wikiHttpClient, ObjectMapper objectMapper, IcProperties properties) {
        return new WikiClient(wikiHttpClient, objectMapper, properties.wiki());
    }
}
