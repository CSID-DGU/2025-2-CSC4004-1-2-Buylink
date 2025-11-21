// src/main/java/io/github/hayo02/proxyshopping/orders/entity/OrderItem.java
package io.github.hayo02.proxyshopping.orders.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "order_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 다대일 - 주문
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    @Setter
    private Order order;

    @Column(nullable = false, length = 255)
    private String productName;

    @Column(nullable = false)
    private Integer priceKrw;

    // CartItem 에 quantity 필드가 없어도 되도록 기본값 1 사용
    @Column(nullable = false)
    private Integer quantity;

    @Column(length = 500)
    private String imageUrl;
}
