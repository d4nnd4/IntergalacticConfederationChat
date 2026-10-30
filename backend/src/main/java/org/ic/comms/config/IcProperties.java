package org.ic.comms.config;

import java.net.URI;
import java.time.Duration;
import java.util.List;

import org.ic.comms.chat.Channel;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ic")
public record IcProperties(List<String> allowedOrigins, Stomp stomp, Chat chat, Bot bot, Wiki wiki) {

    public record Stomp(String host, int port, String login, String passcode, String virtualHost) {
    }

    public record Chat(int historySize, int maxMessageLength, int burst, Duration refillEvery, List<Channel> channels) {
    }

    public record Bot(int maxQuestionLength, int summarySentences, int summaryMaxChars) {
    }

    public record Wiki(URI apiUrl, String articleBaseUrl, Duration timeout, Duration cacheTtl, long cacheSize,
                       String userAgent) {
    }
}
