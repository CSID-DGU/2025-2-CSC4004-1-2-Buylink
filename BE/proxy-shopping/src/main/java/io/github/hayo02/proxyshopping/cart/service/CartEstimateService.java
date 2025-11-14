package io.github.hayo02.proxyshopping.cart.service;

import io.github.hayo02.proxyshopping.cart.dto.CartEstimateRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartEstimateResponse;

public interface CartEstimateService {

    CartEstimateResponse estimate(String proxySid, CartEstimateRequest request);
}
