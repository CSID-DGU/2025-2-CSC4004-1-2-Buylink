package io.github.hayo02.proxyshopping.cart.dto;

/**
 * 장바구니 견적 계산 결과 응답 DTO
 */
public class CartEstimateResponse {

    // 1) 기본 금액
    private long productTotalKRW;       // 상품 금액 합계
    private long serviceFeeKRW;         // 대행 수수료(5%)

    // 2) 무게/부피 정보
    private double totalActualWeightKg; // 실무게 합
    private double totalVolumeM3;       // 부피 합
    private double volumetricWeightKg;  // 부피무게
    private double chargeableWeightKg;  // 청구 기준 무게(실무게 vs 부피무게 중 큰 값)

    // 3) 배송비
    private long emsYen;                // EMS 요율표 상 엔 단위 금액
    private long internationalShippingKRW; // EMS 국제 배송비 (원)
    private long domesticShippingKRW;      // 국내 배송비 (원, 지금은 3,000원 고정)
    private long totalShippingFeeKRW;      // 배송비 합계

    // 4) 수수료/옵션
    private long paymentFeeKRW;         // 결제 수수료(3.4%)
    private long extraPackagingFeeKRW;  // 추가 포장 비용
    private long insuranceFeeKRW;       // 해외배송 보상 보험료

    // 5) 최종 금액
    private long grandTotalKRW;         // 최종 예상 결제 금액

    public CartEstimateResponse() {
    }

    public static CartEstimateResponse of(
            long productTotalKRW,
            long serviceFeeKRW,
            double totalActualWeightKg,
            double totalVolumeM3,
            double volumetricWeightKg,
            double chargeableWeightKg,
            long emsYen,
            long internationalShippingKRW,
            long domesticShippingKRW,
            long totalShippingFeeKRW,
            long paymentFeeKRW,
            long extraPackagingFeeKRW,
            long insuranceFeeKRW,
            long grandTotalKRW
    ) {
        CartEstimateResponse r = new CartEstimateResponse();
        r.productTotalKRW = productTotalKRW;
        r.serviceFeeKRW = serviceFeeKRW;
        r.totalActualWeightKg = totalActualWeightKg;
        r.totalVolumeM3 = totalVolumeM3;
        r.volumetricWeightKg = volumetricWeightKg;
        r.chargeableWeightKg = chargeableWeightKg;
        r.emsYen = emsYen;
        r.internationalShippingKRW = internationalShippingKRW;
        r.domesticShippingKRW = domesticShippingKRW;
        r.totalShippingFeeKRW = totalShippingFeeKRW;
        r.paymentFeeKRW = paymentFeeKRW;
        r.extraPackagingFeeKRW = extraPackagingFeeKRW;
        r.insuranceFeeKRW = insuranceFeeKRW;
        r.grandTotalKRW = grandTotalKRW;
        return r;
    }

    public long getProductTotalKRW() {
        return productTotalKRW;
    }

    public long getServiceFeeKRW() {
        return serviceFeeKRW;
    }

    public double getTotalActualWeightKg() {
        return totalActualWeightKg;
    }

    public double getTotalVolumeM3() {
        return totalVolumeM3;
    }

    public double getVolumetricWeightKg() {
        return volumetricWeightKg;
    }

    public double getChargeableWeightKg() {
        return chargeableWeightKg;
    }

    public long getEmsYen() {
        return emsYen;
    }

    public long getInternationalShippingKRW() {
        return internationalShippingKRW;
    }

    public long getDomesticShippingKRW() {
        return domesticShippingKRW;
    }

    public long getTotalShippingFeeKRW() {
        return totalShippingFeeKRW;
    }

    public long getPaymentFeeKRW() {
        return paymentFeeKRW;
    }

    public long getExtraPackagingFeeKRW() {
        return extraPackagingFeeKRW;
    }

    public long getInsuranceFeeKRW() {
        return insuranceFeeKRW;
    }

    public long getGrandTotalKRW() {
        return grandTotalKRW;
    }
}
