// src/main/java/io/github/hayo02/proxyshopping/ai/serviceImpl/ProductAiServiceImpl.java
package io.github.hayo02.proxyshopping.ai.serviceImpl;

import io.github.hayo02.proxyshopping.ai.dto.*;
import io.github.hayo02.proxyshopping.ai.service.ProductAiService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@ConditionalOnProperty(prefix = "ai", name = "base-url") // ai.base-url 있을 때만 활성화
public class ProductAiServiceImpl implements ProductAiService {

    private final RestTemplate rt = new RestTemplate();
    private final String endpoint;

    public ProductAiServiceImpl(org.springframework.core.env.Environment env) {
        String base = env.getProperty("ai.base-url", "http://127.0.0.1:7001");
        this.endpoint = base.endsWith("/") ? base + "predict" : base + "/predict";
    }

    @Override
    public AiPredictResponse predict(CrawlerEnvelope env) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<CrawlerEnvelope> req = new HttpEntity<>(env, headers);

        ResponseEntity<AiPredictResponse> resp =
                rt.postForEntity(endpoint, req, AiPredictResponse.class);

        if (!resp.getStatusCode().is2xxSuccessful()) return null;
        return resp.getBody();
    }
}
