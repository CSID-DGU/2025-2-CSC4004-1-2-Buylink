package io.github.hayo02.proxyshopping.orders.repository;

import io.github.hayo02.proxyshopping.orders.entity.ShippingAddress;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ShippingAddressRepository extends JpaRepository<ShippingAddress, Long> {

    List<ShippingAddress> findByProxySidOrderByCreatedAtDesc(String proxySid);

    Optional<ShippingAddress> findTopByProxySidOrderByCreatedAtDesc(String proxySid);
}
