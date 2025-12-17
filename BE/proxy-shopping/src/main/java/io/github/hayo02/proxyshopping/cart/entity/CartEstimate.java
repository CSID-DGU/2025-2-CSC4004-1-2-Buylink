// src/main/java/io/github/hayo02/proxyshopping/cart/entity/CartEstimate.java
package io.github.hayo02.proxyshopping.cart.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "cart_estimate")
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class CartEstimate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // proxySid 기준 1개만 유지 (unique)
    @Column(nullable = false, unique = true, length = 100)
    private String proxySid;

    // 견적 계산 시점의 장바구니 아이템 ID 목록 (JSON 문자열로 저장)
    @Column(length = 1000)
    private String itemIds;

    // 1) 기본 금액
    private Long productTotalKRW;
    private Long serviceFeeKRW;

    // 2) 무게/부피 정보 (단위 변경: g, cm^3)
    private Double totalActualWeightG;  // g
    private Double totalVolumeCm3;      // cm^3
    private Double volumetricWeightG;   // g
    private Double chargeableWeightG;   // g

    // 3) 배송비
    private Long emsYen;
    private Long internationalShippingKRW;
    private Long domesticShippingKRW;
    private Long totalShippingFeeKRW;

    // 4) 수수료/옵션
    private Long paymentFeeKRW;
    private Long extraPackagingFeeKRW;
    private Long insuranceFeeKRW;

    // 5) 최종 금액
    private Long grandTotalKRW;

    // 옵션 값 저장
    private Boolean extraPackaging;
    private Boolean insurance;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    public void onPersist() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
