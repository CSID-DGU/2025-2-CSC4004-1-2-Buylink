// src/main/java/io/github/hayo02/proxyshopping/orders/service/OrderService.java
package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;
import io.github.hayo02.proxyshopping.orders.dto.OrderDetailResponse;

public interface OrderService {

    OrderCreateResponse createOrder(String proxySid, OrderCreateRequest request);

    // 주문 상세 조회
    OrderDetailResponse getOrderDetail(String proxySid, String orderNumber);
}
