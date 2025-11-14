// ai/config/AiClientConfig.java
package io.github.hayo02.proxyshopping.ai.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class AiClientConfig {

    @Bean(name = "aiWebClient")                   // ← 이름 고정!
    @Conditional(AiUrlPresent.class)
    public WebClient aiWebClient(@Value("${ai.base-url}") String baseUrl) {
        return WebClient.builder().baseUrl(baseUrl).build();
    }
}
