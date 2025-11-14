// cart/service/CartQueryService.java
package io.github.hayo02.proxyshopping.cart.service;

import io.github.hayo02.proxyshopping.cart.dto.CartResponse;

public interface CartQueryService {
    CartResponse getCart(String proxySid);
}