package io.github.hayo02.proxyshopping.cart.support;

import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

/**
 * 일본 EMS 1구역(한국 포함) 요율표 기반 국제 배송비 계산기.
 * - 입력: 청구 기준 무게(kg)
 * - 출력: EMS 요율표 상 엔 단위 요금 + 원화 변환
 */
@Component
public class EmsShippingCalculator {

    // 1엔 = 10원 가정 (필요하면 나중에 상수만 변경)
    private static final double YEN_TO_KRW = 10.0;

    // EMS 무게 구간(kg)과 요금(엔) - 10kg까지
    private static final List<WeightBand> BANDS = Arrays.asList(
            new WeightBand(0.5, 1450),
            new WeightBand(0.6, 1600),
            new WeightBand(0.7, 1750),
            new WeightBand(0.8, 1900),
            new WeightBand(0.9, 2050),
            new WeightBand(1.0, 2200),
            new WeightBand(1.25, 2500),
            new WeightBand(1.5, 2800),
            new WeightBand(1.75, 3100),
            new WeightBand(2.0, 3400),
            new WeightBand(2.5, 3900),
            new WeightBand(3.0, 4400),
            new WeightBand(3.5, 4900),
            new WeightBand(4.0, 5400),
            new WeightBand(4.5, 5900),
            new WeightBand(5.0, 6400),
            new WeightBand(5.5, 6900),
            new WeightBand(6.0, 7400),
            new WeightBand(7.0, 8200),
            new WeightBand(8.0, 9000),
            new WeightBand(9.0, 9800),
            new WeightBand(10.0, 10600)
            // 필요하면 30kg까지 더 추가 가능
    );

    public long calculateEmsYen(double chargeableWeightKg) {
        if (chargeableWeightKg <= 0) {
            return 0L;
        }
        for (WeightBand band : BANDS) {
            if (chargeableWeightKg <= band.maxWeightKg) {
                return band.yen;
            }
        }
        // 10kg 초과 시: 마지막 밴드 이후 kg당 800엔씩 추가 (임시 정책)
        WeightBand last = BANDS.get(BANDS.size() - 1);
        double extraKg = Math.max(0, chargeableWeightKg - last.maxWeightKg);
        long extraYen = (long) Math.ceil(extraKg) * 800L;
        return last.yen + extraYen;
    }

    public long convertYenToWon(long yen) {
        double raw = yen * YEN_TO_KRW;
        return roundUpTo10Won(raw);
    }

    private long roundUpTo10Won(double value) {
        return (long) (Math.ceil(value / 10.0) * 10);
    }

    private static class WeightBand {
        final double maxWeightKg;
        final long yen;

        WeightBand(double maxWeightKg, long yen) {
            this.maxWeightKg = maxWeightKg;
            this.yen = yen;
        }
    }
}
