// src/main/java/io/github/hayo02/proxyshopping/cart/repository/CartItemRepository.java
package io.github.hayo02.proxyshopping.cart.repository;

import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {

    boolean existsByProxySidAndUrl(String proxySid, String url);

    List<CartItem> findByProxySidOrderByCreatedAtDesc(String proxySid);

    List<CartItem> findByProxySidAndIdIn(String proxySid, List<Long> ids);

    // 전체 삭제용 조회
    List<CartItem> findByProxySid(String proxySid);
}
