// src/components/CartQuotation.tsx
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Info } from "lucide-react";

export interface CartEstimate {
  productTotalKRW: number;
  serviceFeeKRW: number;

  totalActualWeightKg: number;
  totalVolumeM3: number;
  volumetricWeightKg: number;
  chargeableWeightKg: number;

  emsYen: number;
  internationalShippingKRW: number;
  domesticShippingKRW: number;
  totalShippingFeeKRW: number;

  paymentFeeKRW: number;
  extraPackagingFeeKRW: number;
  insuranceFeeKRW: number;

  grandTotalKRW: number;
}

interface CartQuotationProps {
  extraPackaging: boolean;
  insurance: boolean;
  onCheckout: () => void;
}

const formatKRW = (v: number) => `${v.toLocaleString()}원`;

export default function CartQuotation({
  extraPackaging,
  insurance,
  onCheckout,
}: CartQuotationProps) {
  const [estimate, setEstimate] = useState<CartEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const subtotal = estimate
    ? estimate.productTotalKRW +
      estimate.serviceFeeKRW +
      estimate.totalShippingFeeKRW
    : 0;

  // 🔸 extraPackaging / insurance 바뀔 때마다 견적 API 호출 (지금은 목업)
  useEffect(() => {
    const fetchEstimate = async () => {
      setIsLoading(true);
      try {
        const payload = {
          extraPackaging,
          insurance,
        };

        // 🔽 실제 백엔드 연결 시
        /*
        const res = await fetch("/api/cart/estimate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || "견적 계산 실패");
        }
        setEstimate(json.data as CartEstimate);
        */

        // 🔥 백엔드 연결 전: 목업 데이터로 동작
        const base: CartEstimate = {
          productTotalKRW: 11990,
          serviceFeeKRW: 600,

          totalActualWeightKg: 0.4,
          totalVolumeM3: 0.003,
          volumetricWeightKg: 0.6,
          chargeableWeightKg: 0.6,

          emsYen: 1600,
          internationalShippingKRW: 16000,
          domesticShippingKRW: 3000,
          totalShippingFeeKRW: 19000,

          paymentFeeKRW: 1080,
          extraPackagingFeeKRW: 0,
          insuranceFeeKRW: 0,
          grandTotalKRW: 0, // 아래에서 다시 계산
        };

        const extraPackagingFeeKRW = extraPackaging ? 2000 : 0;
        const insuranceFeeKRW = insurance ? 500 : 0;

        const grandTotalKRW =
          base.productTotalKRW +
          base.serviceFeeKRW +
          base.totalShippingFeeKRW +
          base.paymentFeeKRW +
          extraPackagingFeeKRW +
          insuranceFeeKRW;

        const mock: CartEstimate = {
          ...base,
          extraPackagingFeeKRW,
          insuranceFeeKRW,
          grandTotalKRW,
        };

        // payload 사용 안 해서 린트 경고 나올 수 있어서 더미 사용
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _unused = payload;

        setEstimate(mock);
      } catch (e) {
        console.error(e);
        setEstimate(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEstimate();
  }, [extraPackaging, insurance]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[#e5e5ec]/50 space-y-4 sticky top-24"
    >
      <h3 className="text-[#111111] font-[600]">견적서</h3>

      {/* 로딩 상태 */}
      {isLoading && (
        <p className="text-sm text-[#767676] mt-2">견적을 계산 중입니다...</p>
      )}

      {/* 견적 없음 (API 실패 등) */}
      {!isLoading && !estimate && (
        <p className="text-sm text-[#767676] mt-2">
          견적 정보를 불러오지 못했습니다.
        </p>
      )}

      {/* 견적 표시 */}
      {!isLoading && estimate && (
        <>
          {/* 상단 합계 전까지 */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#505050]">상품 금액</span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.productTotalKRW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505050]">대행 수수료</span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.serviceFeeKRW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505050]">해외+국내 배송비</span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.totalShippingFeeKRW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505050]">합배송비</span>
              <span className="text-[#111111] font-[500]">-</span>
            </div>
          </div>

          <div className="h-px bg-[#e5e5ec]" />

          {/* 합계액 */}
          <div className="flex justify-between">
            <span className="text-[#111111] font-[500]">합계액</span>
            <span className="text-[#ffcc4c] font-[600]">
              {formatKRW(subtotal)}
            </span>
          </div>

          {/* 수수료 / 옵션 비용 */}
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[#505050]">+ 결제 수수료(3.4%)</span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.paymentFeeKRW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505050]">+ [선택] 추가 포장 비용</span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.extraPackagingFeeKRW)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#505050]">
                + [선택] 해외 배송 보상 보험료
              </span>
              <span className="text-[#111111] font-[500]">
                {formatKRW(estimate.insuranceFeeKRW)}
              </span>
            </div>
          </div>

          <div className="h-px bg-[#e5e5ec]" />

          {/* 최종 결제 금액 */}
          <div className="flex justify-between items-center">
            <span className="text-[#111111] font-[600]">최종 결제 금액</span>
            <span className="text-lg text-[#111111] font-[700]">
              {formatKRW(estimate.grandTotalKRW)}
            </span>
          </div>

          {/* 안내 문구 */}
          <div className="flex items-start gap-2 p-3 bg-[#fff5c9]/50 rounded-lg mt-2">
            <Info className="w-4 h-4 text-[#ff9200] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed text-[#505050] space-y-1">
              <p>· 배송비는 실무게와 부피 무게 중 더 무거운 쪽으로 계산됩니다.</p>
              <p>· 10만원 단위로 결제 금액이 달라질 수 있습니다.</p>
              <p>· 상품 개수 및 포장 상태에 따라 추가 비용이 발생할 수 있습니다.</p>
            </div>
          </div>

          {/* 결제 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCheckout}
            className="w-full mt-3 py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] shadow-lg hover:shadow-xl transition-all duration-300 font-[600]"
          >
            {`${estimate.grandTotalKRW.toLocaleString()}원 결제하기`}
          </motion.button>
        </>
      )}
    </motion.div>
  );
}
