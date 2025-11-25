package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import lombok.Builder;
import lombok.Getter;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class OrderDetailResponse {

    // 주문번호 (Order.orderNumber) → orderId 로 노출
    private String orderId;

    // 수령인 이름
    private String receiver;

    // 결제수단 (아직 저장 X, 나중에 확장)
    private String paymentMethod;

    // 최종 결제 금액
    private Long totalAmount;

    // 주문 상품 목록
    private List<OrderItemDetailDto> items;

    // 배송비 요약
    private ShippingSummary shipping;

    public static OrderDetailResponse from(Order order) {
        // TODO: paymentMethod, shipping 값은 나중에 실제 값으로 교체
        return OrderDetailResponse.builder()
                .orderId(order.getOrderNumber())
                .receiver(order.getReceiverName())
                .paymentMethod(null) // 나중에 토스/결제정보 연동 시 세팅
                .totalAmount(order.getTotalAmount())
                .items(
                        order.getItems().stream()
                                .map(OrderItemDetailDto::from)
                                .collect(Collectors.toList())
                )
                .shipping(
                        ShippingSummary.builder()
                                .domestic(0L)
                                .international(0L)
                                .build()
                )
                .build();
    }

    @Getter
    @Builder
    public static class ShippingSummary {
        private Long domestic;      // 국내 배송비
        private Long international; // 국제 배송비
    }
}
