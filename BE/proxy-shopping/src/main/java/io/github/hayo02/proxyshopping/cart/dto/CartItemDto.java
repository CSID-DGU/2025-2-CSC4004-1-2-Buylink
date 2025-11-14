// cart/dto/CartItemDto.java
package io.github.hayo02.proxyshopping.cart.dto;

public class CartItemDto {
    private Long id;
    private String productName;
    private Integer priceKRW;
    private String imageUrl;

    public CartItemDto() {}
    public CartItemDto(Long id, String productName, Integer priceKRW, String imageUrl) {
        this.id = id; this.productName = productName; this.priceKRW = priceKRW; this.imageUrl = imageUrl;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Integer getPriceKRW() { return priceKRW; }
    public void setPriceKRW(Integer priceKRW) { this.priceKRW = priceKRW; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
}
