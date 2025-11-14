package io.github.hayo02.proxyshopping.orders.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "shipping_address")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
@Builder
public class ShippingAddress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 익명 세션 식별용
    @Column(nullable = false, length = 100)
    private String proxySid;

    @Column(nullable = false, length = 50)
    private String receiverName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(nullable = false, length = 10)
    private String postalCode;   // 우편번호

    @Column(nullable = false, length = 255)
    private String roadAddress;  // 도로명 주소

    @Column(nullable = false, length = 255)
    private String detailAddress; // 상세 주소

    @Column(length = 255)
    private String deliveryRequest; // 배송 요청 사항

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void onPersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
