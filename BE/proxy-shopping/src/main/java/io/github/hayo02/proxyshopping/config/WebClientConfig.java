package io.github.hayo02.proxyshopping.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    @Bean
    public WebClient crawlerWebClient(
            @Value("${python.crawler.base-url:http://localhost:5001}") String baseUrl
    ) {
        return WebClient.builder().baseUrl(baseUrl).build();
    }
}

