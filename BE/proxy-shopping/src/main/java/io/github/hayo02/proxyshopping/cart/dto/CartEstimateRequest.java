package io.github.hayo02.proxyshopping.cart.dto;

public class CartEstimateRequest {

    // 추가 포장 여부 (프론트에서 체크박스 선택 값)
    private boolean extraPackaging;

    // 해외 배송 보상 보험 여부
    private boolean insurance;

    public CartEstimateRequest() {
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
