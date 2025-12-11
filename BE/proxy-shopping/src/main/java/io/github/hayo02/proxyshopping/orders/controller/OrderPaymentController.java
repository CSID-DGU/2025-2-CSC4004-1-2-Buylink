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

        TossPayConfirmResponse resp = paymentService.confirm(req);
        return ApiResponse.ok(resp);
    }
}
