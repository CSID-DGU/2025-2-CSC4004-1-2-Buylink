package io.github.hayo02.proxyshopping.orders.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class ShippingAddressRequest {

    @NotBlank
    @Size(max = 50)
    private String receiverName;

    @NotBlank
    @Size(max = 20)
    private String phone;

    @NotBlank
    @Size(max = 10)
    private String postalCode;

    @NotBlank
    @Size(max = 255)
    private String roadAddress;

    @NotBlank
    @Size(max = 255)
    private String detailAddress;

    @Size(max = 255)
    private String deliveryRequest;
}
