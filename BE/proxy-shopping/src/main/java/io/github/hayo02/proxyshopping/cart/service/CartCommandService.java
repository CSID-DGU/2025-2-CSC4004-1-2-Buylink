// src/main/java/io/github/hayo02/proxyshopping/cart/service/CartCommandService.java
package io.github.hayo02.proxyshopping.cart.service;

import io.github.hayo02.proxyshopping.cart.dto.CartAddRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartResponse;
import io.github.hayo02.proxyshopping.cart.dto.DeleteResponse;

import java.util.List;

public interface CartCommandService {

    // 장바구니 담기
    CartResponse add(String proxySid, CartAddRequest request);

    // 선택 삭제 (단건 / 복수 공용)
    DeleteResponse deleteMany(String proxySid, List<Long> ids);

    // 전체 삭제
    DeleteResponse clear(String proxySid);
}
