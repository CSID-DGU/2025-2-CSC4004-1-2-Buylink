// src/main/java/io/github/hayo02/proxyshopping/orders/dto/OrderCreateResponse.java
package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderCreateResponse {

    private String orderNumber;
    private Long totalAmount;
    private String status; // PENDING / PAID 등

    public static OrderCreateResponse from(Order order) {
        return OrderCreateResponse.builder()
                .orderNumber(order.getOrderNumber())
                .totalAmount(order.getTotalAmount())
                .status(order.getStatus().name())
                .build();
    }
}
