package org.ic.comms.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private static final long BROKER_HEARTBEAT_MS = 10_000;
    private static final int MESSAGE_SIZE_LIMIT = 16 * 1024;
    private static final int SEND_BUFFER_LIMIT = 512 * 1024;
    private static final int SEND_TIME_LIMIT_MS = 15_000;

    private final IcProperties properties;
    private final InboundDestinationGuard destinationGuard;

    public WebSocketConfig(IcProperties properties, InboundDestinationGuard destinationGuard) {
        this.properties = properties;
        this.destinationGuard = destinationGuard;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(properties.allowedOrigins().toArray(String[]::new));
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        IcProperties.Stomp stomp = properties.stomp();
        registry.setApplicationDestinationPrefixes("/app");
        registry.enableStompBrokerRelay("/exchange")
                .setRelayHost(stomp.host())
                .setRelayPort(stomp.port())
                .setVirtualHost(stomp.virtualHost())
                .setClientLogin(stomp.login())
                .setClientPasscode(stomp.passcode())
                .setSystemLogin(stomp.login())
                .setSystemPasscode(stomp.passcode())
                .setSystemHeartbeatSendInterval(BROKER_HEARTBEAT_MS)
                .setSystemHeartbeatReceiveInterval(BROKER_HEARTBEAT_MS);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(destinationGuard);
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.setMessageSizeLimit(MESSAGE_SIZE_LIMIT)
                .setSendBufferSizeLimit(SEND_BUFFER_LIMIT)
                .setSendTimeLimit(SEND_TIME_LIMIT_MS);
    }
}
