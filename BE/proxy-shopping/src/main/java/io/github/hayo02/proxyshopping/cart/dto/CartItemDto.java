package io.github.hayo02.proxyshopping.cart.dto;

public class CartItemDto {
    private Long id;
    private String productName;
    private Integer priceKRW;
    private String imageUrl;

    // AI 예측 값 추가
    private Double aiWeightKg; // kg
    private Double aiVolumeM3; // m^3

    public CartItemDto() {}

    public CartItemDto(Long id,
                       String productName,
                       Integer priceKRW,
                       String imageUrl,
                       Double aiWeightKg,
                       Double aiVolumeM3) {
        this.id = id;
        this.productName = productName;
        this.priceKRW = priceKRW;
        this.imageUrl = imageUrl;
        this.aiWeightKg = aiWeightKg;
        this.aiVolumeM3 = aiVolumeM3;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }

    public Integer getPriceKRW() { return priceKRW; }
    public void setPriceKRW(Integer priceKRW) { this.priceKRW = priceKRW; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public Double getAiWeightKg() { return aiWeightKg; }
    public void setAiWeightKg(Double aiWeightKg) { this.aiWeightKg = aiWeightKg; }

    public Double getAiVolumeM3() { return aiVolumeM3; }
    public void setAiVolumeM3(Double aiVolumeM3) { this.aiVolumeM3 = aiVolumeM3; }
}
