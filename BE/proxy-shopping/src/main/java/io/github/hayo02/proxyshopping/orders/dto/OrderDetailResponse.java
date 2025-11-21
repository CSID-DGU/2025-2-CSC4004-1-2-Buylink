// src/main/java/io/github/hayo02/proxyshopping/orders/dto/OrderDetailResponse.java
package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
public class OrderDetailResponse {

    private String orderNumber;
    private Long totalAmount;
    private String status;
    private String customsCode;

    // 배송지 스냅샷
    private String receiverName;
    private String phone;
    private String postalCode;
    private String roadAddress;
    private String detailAddress;
    private String deliveryRequest;

    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    private List<OrderItemDetailDto> items;

    public static OrderDetailResponse from(Order order) {
        return OrderDetailResponse.builder()
                .orderNumber(order.getOrderNumber())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus().name())
                .customsCode(order.getCustomsCode())
                .receiverName(order.getReceiverName())
                .phone(order.getPhone())
                .postalCode(order.getPostalCode())
                .roadAddress(order.getRoadAddress())
                .detailAddress(order.getDetailAddress())
                .deliveryRequest(order.getDeliveryRequest())
                .createdAt(order.getCreatedAt())
                .paidAt(order.getPaidAt())
                .items(
                        order.getItems().stream()
                                .map(OrderItemDetailDto::from)
                                .collect(Collectors.toList())
                )
                .build();
    }
}
