package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressRequest;
import io.github.hayo02.proxyshopping.orders.dto.ShippingAddressResponse;

public interface ShippingAddressService {

    ShippingAddressResponse register(String proxySid, ShippingAddressRequest request);
}
