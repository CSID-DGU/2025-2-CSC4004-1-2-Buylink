// src/main/java/io/github/hayo02/proxyshopping/orders/dto/OrderCreateRequest.java
package io.github.hayo02.proxyshopping.orders.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class OrderCreateRequest {

    // 배송지 id (ShippingAddress id)
    @NotNull
    private Long addressId;

    // 개인통관고유부호 (없으면 null 가능)
    @Size(max = 20)
    private String customsCode;

    // 최종 결제 금액 (토스 amount 와 동일해야 함)
    @NotNull
    private Long totalAmount;
}
