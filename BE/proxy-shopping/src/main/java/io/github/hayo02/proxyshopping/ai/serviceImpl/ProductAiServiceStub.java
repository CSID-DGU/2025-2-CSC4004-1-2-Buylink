// src/main/java/io/github/hayo02/proxyshopping/ai/serviceImpl/ProductAiServiceStub.java
package io.github.hayo02.proxyshopping.ai.serviceImpl;

import io.github.hayo02.proxyshopping.ai.dto.AiPredictResponse;
import io.github.hayo02.proxyshopping.ai.dto.CrawlerEnvelope;
import io.github.hayo02.proxyshopping.ai.service.ProductAiService;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

@Service
@Primary // 동일 타입 빈이 여러 개여도 이걸 우선 사용
public class ProductAiServiceStub implements ProductAiService {
    @Override
    public AiPredictResponse predict(CrawlerEnvelope env) {
        // AI 미연동 상태에서는 null 반환(저장 시 AI 필드 스킵)
        return null;

        // 간단히 대략값을 주고 싶다면 위 대신 아래 주석 해제:
        // AiPredictResponse r = new AiPredictResponse();
        // r.setWeight(0.4);   // kg
        // r.setVolume(0.002); // m^3
        // return r;
    }
}
