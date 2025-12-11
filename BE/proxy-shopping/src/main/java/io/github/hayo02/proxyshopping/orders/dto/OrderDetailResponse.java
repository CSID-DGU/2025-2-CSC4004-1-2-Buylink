// src/main/java/io/github/hayo02/proxyshopping/orders/dto/OrderDetailResponse.java
package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.Order;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class OrderDetailResponse {
    private String orderId;
    private String receiver;
    private String phone;
    private String postalCode;
    private String roadAddress;
    private String detailAddress;
    private String deliveryRequest;
    private String paymentMethod;
    private Long totalAmount;

    private List<OrderItemDetailDto> items;
    private ShippingSummary shipping;

    // ====== 견적/비용 관련 필드들 ======
    private Long productTotalKRW;
    private Long serviceFeeKRW;

    // 단위: g
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

    public static OrderDetailResponse from(Order order) {
        return OrderDetailResponse.builder()
                .orderId(order.getOrderNumber())
                .receiver(order.getReceiverName())
                .phone(order.getPhone())
                .postalCode(order.getPostalCode())
                .roadAddress(order.getRoadAddress())
                .detailAddress(order.getDetailAddress())
                .deliveryRequest(order.getDeliveryRequest())
                .paymentMethod("toss")
                .totalAmount(order.getTotalAmount())
                .items(
                        order.getItems().stream()
                                .map(OrderItemDetailDto::from)
                                .collect(Collectors.toList())
                )
                .shipping(
                        ShippingSummary.builder()
                                .domestic(order.getDomesticShippingKRW())
                                .international(order.getInternationalShippingKRW())
                                .build()
                )
                // 견적 필드 매핑
                .productTotalKRW(order.getProductTotalKRW())
                .serviceFeeKRW(order.getServiceFeeKRW())
                .volumetricWeightG(order.getVolumetricWeightG())
                .chargeableWeightG(order.getChargeableWeightG())
                .emsYen(order.getEmsYen())
                .internationalShippingKRW(order.getInternationalShippingKRW())
                .domesticShippingKRW(order.getDomesticShippingKRW())
                .totalShippingFeeKRW(order.getTotalShippingFeeKRW())
                .paymentFeeKRW(order.getPaymentFeeKRW())
                .extraPackagingFeeKRW(order.getExtraPackagingFeeKRW())
                .insuranceFeeKRW(order.getInsuranceFeeKRW())
                .grandTotalKRW(order.getGrandTotalKRW())
                .build();
    }

    @Getter
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ShippingSummary {
        private Long domestic;
        private Long international;
    }
}
