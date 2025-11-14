// src/main/java/io/github/hayo02/proxyshopping/order/serviceImpl/TossPaymentServiceImpl.java
package io.github.hayo02.proxyshopping.orders.serviceImpl;

import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmRequest;
import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmResponse;
import io.github.hayo02.proxyshopping.orders.service.PaymentService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Map;

@Service
public class TossPaymentServiceImpl implements PaymentService {

    private final WebClient webClient;

    public TossPaymentServiceImpl(
            @Value("${toss.secret-key}") String secretKey,
            @Value("${toss.base-url}") String baseUrl
    ) {
        String basicAuth = "Basic " + Base64.getEncoder()
                .encodeToString((secretKey + ":").getBytes(StandardCharsets.UTF_8));

        this.webClient = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Authorization", basicAuth)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    @Override
    public TossPayConfirmResponse confirm(TossPayConfirmRequest req) {
        Map<String, Object> body = Map.of(
                "paymentKey", req.getPaymentKey(),
                "orderId", req.getOrderId(),
                "amount", req.getAmount()
        );

        try {
            return webClient.post()
                    .uri("/v1/payments/confirm")
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(TossPayConfirmResponse.class)
                    .block();
        } catch (WebClientResponseException e) {
            // 토스에서 에러 리턴한 경우
            if (e.getStatusCode() == HttpStatus.BAD_REQUEST ||
                    e.getStatusCode() == HttpStatus.UNAUTHORIZED ||
                    e.getStatusCode() == HttpStatus.FORBIDDEN) {
                // 전역 예외 핸들러에서 잡히도록 런타임 예외로 던져줌
                throw new IllegalStateException("토스 결제 승인 실패: " + e.getResponseBodyAsString(), e);
            }
            throw e;
        }
    }
}
