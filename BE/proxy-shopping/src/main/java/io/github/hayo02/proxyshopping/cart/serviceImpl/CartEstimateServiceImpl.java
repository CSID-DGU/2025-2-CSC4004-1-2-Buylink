package io.github.hayo02.proxyshopping.cart.serviceImpl;

import io.github.hayo02.proxyshopping.cart.dto.CartEstimateRequest;
import io.github.hayo02.proxyshopping.cart.dto.CartEstimateResponse;
import io.github.hayo02.proxyshopping.cart.entity.CartItem;
import io.github.hayo02.proxyshopping.cart.repository.CartItemRepository;
import io.github.hayo02.proxyshopping.cart.service.CartEstimateService;
import io.github.hayo02.proxyshopping.cart.support.EmsShippingCalculator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class CartEstimateServiceImpl implements CartEstimateService {

    // AI 값이 null일 때 사용할 기본값들
    private static final double DEFAULT_WEIGHT_KG = 0.4;   // kg
    private static final double DEFAULT_VOLUME_M3 = 0.003; // m^3

    // 부피 → 부피무게 환산 계수 (1㎥당 200kg 가정)
    private static final double DENSITY_COEFF = 200.0;

    // 대행 수수료 비율 5%
    private static final double SERVICE_FEE_RATE = 0.05;

    // 결제 수수료 비율 3.4%
    private static final double PAYMENT_FEE_RATE = 0.034;

    // 국내 배송비 고정 3,000원
    private static final long DOMESTIC_SHIPPING_FEE_KRW = 3000L;

    private final CartItemRepository cartItemRepository;
    private final EmsShippingCalculator emsShippingCalculator;

    public CartEstimateServiceImpl(CartItemRepository cartItemRepository,
                                   EmsShippingCalculator emsShippingCalculator) {
        this.cartItemRepository = cartItemRepository;
        this.emsShippingCalculator = emsShippingCalculator;
    }

    @Override
    public CartEstimateResponse estimate(String proxySid, CartEstimateRequest request) {
        List<CartItem> items = cartItemRepository.findByProxySidOrderByCreatedAtDesc(proxySid);
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("장바구니가 비어 있습니다.");
        }

        // 1) 상품 금액 합계
        long productTotalKRW = items.stream()
                .mapToLong(item -> item.getPriceKRW() != null ? item.getPriceKRW() : 0L)
                .sum();

        // 2) 대행 수수료 (5%, 10원 단위 올림)
        long serviceFeeKRW = roundUpTo10Won(productTotalKRW * SERVICE_FEE_RATE);

        // 3) 실무게/부피 합산
        double totalActualWeightKg = items.stream()
                .mapToDouble(item -> item.getAiWeightKg() != null ? item.getAiWeightKg() : DEFAULT_WEIGHT_KG)
                .sum();

        double totalVolumeM3 = items.stream()
                .mapToDouble(item -> item.getAiVolumeM3() != null ? item.getAiVolumeM3() : DEFAULT_VOLUME_M3)
                .sum();

        double volumetricWeightKg = totalVolumeM3 * DENSITY_COEFF;
        double chargeableWeightKg = Math.max(totalActualWeightKg, volumetricWeightKg);

        // 4) EMS 국제배송비 계산
        long emsYen = emsShippingCalculator.calculateEmsYen(chargeableWeightKg);
        long internationalShippingKRW = emsShippingCalculator.convertYenToWon(emsYen);

        // 5) 국내 배송비 = 3,000원 고정
        long domesticShippingKRW = DOMESTIC_SHIPPING_FEE_KRW;

        long totalShippingFeeKRW = internationalShippingKRW + domesticShippingKRW;

        // 6) 결제 수수료 (3.4%, 10원 단위 올림)
        long paymentBase = productTotalKRW + serviceFeeKRW + totalShippingFeeKRW;
        long paymentFeeKRW = roundUpTo10Won(paymentBase * PAYMENT_FEE_RATE);

        // 7) 옵션 비용
        long extraPackagingFeeKRW = request.isExtraPackaging() ? 2000L : 0L;
        long insuranceFeeKRW = request.isInsurance() ? 5000L : 0L;

        // 8) 최종 금액
        long grandTotalKRW = productTotalKRW
                + serviceFeeKRW
                + totalShippingFeeKRW
                + paymentFeeKRW
                + extraPackagingFeeKRW
                + insuranceFeeKRW;

        return CartEstimateResponse.of(
                productTotalKRW,
                serviceFeeKRW,
                totalActualWeightKg,
                totalVolumeM3,
                volumetricWeightKg,
                chargeableWeightKg,
                emsYen,
                internationalShippingKRW,
                domesticShippingKRW,
                totalShippingFeeKRW,
                paymentFeeKRW,
                extraPackagingFeeKRW,
                insuranceFeeKRW,
                grandTotalKRW
        );
    }

    private long roundUpTo10Won(double value) {
        return (long) (Math.ceil(value / 10.0) * 10);
    }
}
