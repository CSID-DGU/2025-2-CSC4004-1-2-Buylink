// src/main/java/io/github/hayo02/proxyshopping/orders/controller/OrderPaymentController.java
package io.github.hayo02.proxyshopping.orders.controller;

import io.github.hayo02.proxyshopping.common.ApiResponse;
import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmRequest;
import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmResponse;
import io.github.hayo02.proxyshopping.orders.service.PaymentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderPaymentController {

    private final PaymentService paymentService;

    public OrderPaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/pay")
    public ApiResponse<TossPayConfirmResponse> pay(@RequestBody TossPayConfirmRequest req) {

        // 나중에 여기서
        // 1) orderId로 우리 주문 테이블 조회
        // 2) amount 일치 여부 검증
        // 3) 주문 상태 업데이트
        // 이런 도메인 로직 추가하면 됨.

        TossPayConfirmResponse resp = paymentService.confirm(req);
        return ApiResponse.ok(resp);
    }
}
