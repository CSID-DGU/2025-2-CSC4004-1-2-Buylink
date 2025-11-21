// src/main/java/io/github/hayo02/proxyshopping/orders/repository/OrderRepository.java
package io.github.hayo02.proxyshopping.orders.repository;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    Optional<Order> findByOrderNumberAndProxySid(String orderNumber, String proxySid);
}
