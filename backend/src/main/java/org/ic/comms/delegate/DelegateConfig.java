package org.ic.comms.delegate;

import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DelegateConfig {

    @Bean(destroyMethod = "shutdown")
    ScheduledExecutorService delegateScheduler() {
        return Executors.newSingleThreadScheduledExecutor(
                Thread.ofPlatform().name("delegate-relay").daemon(true).factory());
    }
}
