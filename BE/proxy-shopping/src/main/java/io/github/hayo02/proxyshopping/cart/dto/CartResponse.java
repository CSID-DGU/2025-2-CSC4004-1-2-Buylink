// cart/dto/CartResponse.java
package io.github.hayo02.proxyshopping.cart.dto;

import java.util.List;

public class CartResponse {
    private List<CartItemDto> items;
    private Integer totalKRW;

    public CartResponse() {}
    public CartResponse(List<CartItemDto> items, Integer totalKRW) {
        this.items = items; this.totalKRW = totalKRW;
    }
    public List<CartItemDto> getItems() { return items; }
    public void setItems(List<CartItemDto> items) { this.items = items; }
    public Integer getTotalKRW() { return totalKRW; }
    public void setTotalKRW(Integer totalKRW) { this.totalKRW = totalKRW; }
}
