// src/main/java/io/github/hayo02/proxyshopping/orders/service/OrderService.java
package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.OrderCreateRequest;
import io.github.hayo02.proxyshopping.orders.dto.OrderCreateResponse;

public interface OrderService {

    OrderCreateResponse createOrder(String proxySid, OrderCreateRequest request);
}
