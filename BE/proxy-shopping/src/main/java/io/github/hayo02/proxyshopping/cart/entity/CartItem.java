// src/main/java/io/github/hayo02/proxyshopping/cart/entity/CartItem.java
package io.github.hayo02.proxyshopping.cart.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cart_item", indexes = {
        @Index(name = "idx_cart_sid", columnList = "proxy_sid")
})
public class CartItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name="proxy_sid", nullable = false, length = 80)
    private String proxySid;

    @Column(nullable = false, length = 200)
    private String productName;

    @Column(name = "price_krw")
    private Integer priceKRW;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "url", length = 300)
    private String url;

    // AI 결과 필드
    @Column(name = "ai_weight_kg")
    private Double aiWeightKg;   // kg

    @Column(name = "ai_volume_m3")
    private Double aiVolumeM3;   // m^3

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }

    // getters/setters
    public Long getId() { return id; }
    public String getProxySid() { return proxySid; }
    public void setProxySid(String proxySid) { this.proxySid = proxySid; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public Integer getPriceKRW() { return priceKRW; }
    public void setPriceKRW(Integer priceKRW) { this.priceKRW = priceKRW; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public Double getAiWeightKg() { return aiWeightKg; }
    public void setAiWeightKg(Double aiWeightKg) { this.aiWeightKg = aiWeightKg; }
    public Double getAiVolumeM3() { return aiVolumeM3; }
    public void setAiVolumeM3(Double aiVolumeM3) { this.aiVolumeM3 = aiVolumeM3; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
