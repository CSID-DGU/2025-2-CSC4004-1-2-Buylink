// src/main/java/io/github/hayo02/proxyshopping/cart/dto/CrawledProduct.java
package io.github.hayo02.proxyshopping.cart.dto;

import java.util.List;

public class CrawledProduct {
    private String productName;
    private Integer priceKRW;
    private String imageUrl;

    // AI 정확도 향상용(있으면 전달)
    private List<String> imageUrls;
    private String description;
    private Boolean hasShippingFee;
    private String category;

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Integer getPriceKRW() { return priceKRW; }
    public void setPriceKRW(Integer priceKRW) { this.priceKRW = priceKRW; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Boolean getHasShippingFee() { return hasShippingFee; }
    public void setHasShippingFee(Boolean hasShippingFee) { this.hasShippingFee = hasShippingFee; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
}
