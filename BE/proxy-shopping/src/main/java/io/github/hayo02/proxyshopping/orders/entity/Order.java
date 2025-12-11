// src/main/java/io/github/hayo02/proxyshopping/orders/entity/Order.java
package io.github.hayo02.proxyshopping.orders.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 사용자/토스에 노출되는 주문 번호 (예: 20251024723840)
    @Column(nullable = false, unique = true, length = 30)
    private String orderNumber;

    // 익명 세션 식별용
    @Column(nullable = false, length = 100)
    private String proxySid;

    @Column(nullable = false)
    private Long totalAmount; // 최종 결제 금액(견적/토스와 동일해야 함)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrderStatus status;

    // 통관 정보
    @Column(length = 20)
    private String customsCode;

    // 배송지 스냅샷 (ShippingAddress에서 복사)
    @Column(nullable = false, length = 50)
    private String receiverName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 10)
    private String postalCode;

    @Column(nullable = false, length = 255)
    private String roadAddress;

    @Column(nullable = false, length = 255)
    private String detailAddress;

    @Column(length = 255)
    private String deliveryRequest;

    private LocalDateTime createdAt;
    private LocalDateTime paidAt;

    // ===== 견적/비용 관련 필드들 =====
    // (OrderDetailResponse 와 타입/이름 맞추기)
    private Long productTotalKRW;
    private Long serviceFeeKRW;

    // 단위 변경: g
    private Double volumetricWeightG;
    private Double chargeableWeightG;

    private Long emsYen;
    private Long internationalShippingKRW;
    private Long domesticShippingKRW;
    private Long totalShippingFeeKRW;
    private Long paymentFeeKRW;
    private Long extraPackagingFeeKRW;
    private Long insuranceFeeKRW;
    private Long grandTotalKRW;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    @PrePersist
    public void onPersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }

    // 연관관계 편의 메서드
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    public void markPaid(LocalDateTime paidAt) {
        this.status = OrderStatus.PAID;
        this.paidAt = paidAt;
    }
}
