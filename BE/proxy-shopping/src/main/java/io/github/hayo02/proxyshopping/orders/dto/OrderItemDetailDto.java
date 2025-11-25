package io.github.hayo02.proxyshopping.orders.dto;

import io.github.hayo02.proxyshopping.orders.entity.OrderItem;
import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class OrderItemDetailDto {

    private Long id;
    private String productName;
    private Integer price;   // priceKrw → price 로 노출
    private Integer quantity;
    private String imageUrl;

    public static OrderItemDetailDto from(OrderItem item) {
        return OrderItemDetailDto.builder()
                .id(item.getId())
                .productName(item.getProductName())
                .price(item.getPriceKrw())
                .quantity(item.getQuantity())
                .imageUrl(item.getImageUrl())
                .build();
    }
}
