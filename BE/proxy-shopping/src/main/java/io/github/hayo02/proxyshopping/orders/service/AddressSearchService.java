package io.github.hayo02.proxyshopping.orders.service;

import io.github.hayo02.proxyshopping.orders.dto.AddressSearchResponse;

public interface AddressSearchService {

    AddressSearchResponse search(String keyword, int page, int size);
}
