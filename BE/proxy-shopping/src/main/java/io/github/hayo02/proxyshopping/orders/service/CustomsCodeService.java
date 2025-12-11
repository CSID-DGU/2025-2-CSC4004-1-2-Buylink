package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.CustomsCodeVerifyResponse;

public interface CustomsCodeService {

    CustomsCodeVerifyResponse verify(String code);
}
