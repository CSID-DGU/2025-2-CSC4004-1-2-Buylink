// src/main/java/io/github/hayo02/proxyshopping/cart/dto/CartEstimateRequest.java
package io.github.hayo02.proxyshopping.cart.dto;

import java.util.List;

/**
 * 장바구니 견적 계산 요청 DTO
 * - itemIds: 견적을 계산할 장바구니 아이템 id 목록 (선택 상품)
 * - extraPackaging: 추가 포장 옵션
 * - insurance: 해외 배송 보상 보험 옵션
 */
public class CartEstimateRequest {

    // 선택한 장바구니 아이템 id 목록
    // null 또는 빈 리스트면 "장바구니 전체" 기준으로 계산
    private List<Long> itemIds;

    // 추가 포장 여부 (프론트에서 체크박스 선택 값)
    private boolean extraPackaging;

    // 해외 배송 보상 보험 여부
    private boolean insurance;

    public CartEstimateRequest() {
    }

    public List<Long> getItemIds() {
        return itemIds;
    }

    public void setItemIds(List<Long> itemIds) {
        this.itemIds = itemIds;
    }

    public boolean isExtraPackaging() {
        return extraPackaging;
    }

    public void setExtraPackaging(boolean extraPackaging) {
        this.extraPackaging = extraPackaging;
    }

    public boolean isInsurance() {
        return insurance;
    }

    public void setInsurance(boolean insurance) {
        this.insurance = insurance;
    }
}
