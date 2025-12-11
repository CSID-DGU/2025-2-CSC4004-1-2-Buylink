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


    @NotNull
    private Long addressId;

    @Size(max = 20)
    private String customsCode;

    @NotNull
    private Long totalAmount;
}
