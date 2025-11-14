package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.ShippingAddress;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ShippingAddressResponse {

    private Long id;
    private String receiverName;
    private String phone;
    private String postalCode;
    private String roadAddress;
    private String detailAddress;
    private String deliveryRequest;

    public static ShippingAddressResponse from(ShippingAddress entity) {
        return ShippingAddressResponse.builder()
                .id(entity.getId())
                .receiverName(entity.getReceiverName())
                .phone(entity.getPhone())
                .postalCode(entity.getPostalCode())
                .roadAddress(entity.getRoadAddress())
                .detailAddress(entity.getDetailAddress())
                .deliveryRequest(entity.getDeliveryRequest())
                .build();
    }
}
