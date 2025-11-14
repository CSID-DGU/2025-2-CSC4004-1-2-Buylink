package io.github.hayo02.proxyshopping.cart.dto;

import java.util.List;

public class CartAddRequest {
    // 1) 필수: 상품 URL
    private String url;

    // 2) 상품 정보 스냅샷 (FE가 /api/products/fetch 응답에서 채워줌)
    private String productName;
    private Integer priceKRW;
    private String imageUrl;          // 대표 이미지 (없으면 imageUrls[0] 사용 가능)
    private List<String> imageUrls;   // 전체 이미지 리스트
    private String description;
    private Boolean hasShippingFee;
    private String category;
    private Boolean isSoldOut;        // 품절 여부

    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }

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

    public Boolean getIsSoldOut() { return isSoldOut; }
    public void setIsSoldOut(Boolean isSoldOut) { this.isSoldOut = isSoldOut; }
}
