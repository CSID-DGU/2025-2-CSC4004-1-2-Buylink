package io.github.hayo02.proxyshopping.cart.repository;

import io.github.hayo02.proxyshopping.cart.entity.CartEstimate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface CartEstimateRepository extends JpaRepository<CartEstimate, Long> {

    Optional<CartEstimate> findByProxySid(String proxySid);

    void deleteByProxySid(String proxySid);
}
