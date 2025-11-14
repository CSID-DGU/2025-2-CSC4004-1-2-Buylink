// src/main/java/io/github/hayo02/proxyshopping/ai/service/ProductAiService.java
package io.github.hayo02.proxyshopping.ai.service;

import io.github.hayo02.proxyshopping.ai.dto.AiPredictResponse;
import io.github.hayo02.proxyshopping.ai.dto.CrawlerEnvelope;

public interface ProductAiService {
    AiPredictResponse predict(CrawlerEnvelope req);
}
