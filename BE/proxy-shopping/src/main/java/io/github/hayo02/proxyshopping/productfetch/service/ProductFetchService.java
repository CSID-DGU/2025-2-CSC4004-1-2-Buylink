package io.github.hayo02.proxyshopping.productfetch.service;

import io.github.hayo02.proxyshopping.productfetch.dto.ProductFetchRequest;
import io.github.hayo02.proxyshopping.productfetch.dto.ProductInfoDto;

public interface ProductFetchService {
    ProductInfoDto fetch(ProductFetchRequest req);
}
