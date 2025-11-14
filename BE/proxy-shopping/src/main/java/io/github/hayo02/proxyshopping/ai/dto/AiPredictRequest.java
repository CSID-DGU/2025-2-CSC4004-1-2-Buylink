// src/main/java/io/github/hayo02/proxyshopping/ai/dto/AiPredictRequest.java
package io.github.hayo02.proxyshopping.ai.dto;

import java.util.List;

public class AiPredictRequest {
    private String productURL;
    private String productName;
    private String productDescription;
    private Integer priceKRW;
    private Boolean hasShippingFee;
    private String category;
    private List<String> imageUrls;

    public String getProductURL() { return productURL; }
    public void setProductURL(String productURL) { this.productURL = productURL; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getProductDescription() { return productDescription; }
    public void setProductDescription(String productDescription) { this.productDescription = productDescription; }
    public Integer getPriceKRW() { return priceKRW; }
    public void setPriceKRW(Integer priceKRW) { this.priceKRW = priceKRW; }
    public Boolean getHasShippingFee() { return hasShippingFee; }
    public void setHasShippingFee(Boolean hasShippingFee) { this.hasShippingFee = hasShippingFee; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }
}
