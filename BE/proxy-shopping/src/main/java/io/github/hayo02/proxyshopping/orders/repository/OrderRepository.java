package io.github.hayo02.proxyshopping.orders.repository;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    // 기존 메서드 (proxySid 함께 쓰는 용도 – 필요하면 계속 사용)
    Optional<Order> findByOrderNumberAndProxySid(String orderNumber, String proxySid);

    // 주문번호만으로 조회 (주문 상세 조회에 사용)
    Optional<Order> findByOrderNumber(String orderNumber);
}
