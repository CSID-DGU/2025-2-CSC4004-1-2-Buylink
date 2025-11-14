// src/main/java/io/github/hayo02/proxyshopping/orders/service/PaymentService.java
package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmRequest;
import io.github.hayo02.proxyshopping.orders.dto.TossPayConfirmResponse;

public interface PaymentService {

    TossPayConfirmResponse confirm(TossPayConfirmRequest req);
}
