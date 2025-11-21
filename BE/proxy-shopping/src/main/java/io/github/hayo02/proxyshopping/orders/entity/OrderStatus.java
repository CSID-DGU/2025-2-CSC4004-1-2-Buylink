// src/main/java/io/github/hayo02/proxyshopping/orders/entity/OrderStatus.java
package io.github.hayo02.proxyshopping.orders.entity;

public enum OrderStatus {
    PENDING,   // 결제 전 or 결제 대기
    PAID,      // 결제 완료
    CANCELED,  // 취소
    FAILED     // 결제 실패 등
}
