package io.github.hayo02.proxyshopping.orders.controller;

import io.github.hayo02.proxyshopping.common.ApiResponse;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;
import io.github.hayo02.proxyshopping.orders.dto.OrderDetailResponse;
import io.github.hayo02.proxyshopping.orders.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    // 주문 생성 (기존 그대로)
    @PostMapping
    public ApiResponse<OrderCreateResponse> createOrder(
            @RequestHeader(value = "PROXY_SID", required = false) String proxySidHeader,
            @CookieValue(value = "proxy_sid", required = false) String proxySidCookie,
            @Valid @RequestBody OrderCreateRequest request
    ) {
        String proxySid = (proxySidHeader != null && !proxySidHeader.isBlank())
                ? proxySidHeader
                : proxySidCookie;
        if (proxySid == null || proxySid.isBlank()) {
            throw new IllegalArgumentException("proxy_sid 가 필요합니다.");
        }
        OrderCreateResponse resp = orderService.createOrder(proxySid, request);
        return ApiResponse.ok(resp);
    }

    // 주문 상세 조회
    //
    // GET /api/orders/{orderId}?receiver=홍길동&phone=010-1234-5678
    //
    // - orderId  → PathVariable
    // - receiver → QueryString
    // - phone    → QueryString
    @GetMapping("/{orderId}")
    public ApiResponse<OrderDetailResponse> getOrderDetail(
            @PathVariable("orderId") String orderId,
            @RequestParam("receiver") String receiver,
            @RequestParam("phone") String phone
    ) {
        OrderDetailResponse resp = orderService.getOrderDetail(orderId, receiver, phone);
        return ApiResponse.ok(resp);
    }
}
