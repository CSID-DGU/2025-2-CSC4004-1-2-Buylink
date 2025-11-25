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

// 🔹 /api/cart/estimate 응답 모양
type CartEstimateApiResponse = {
  success: boolean;
  data: CartEstimate | null;
  error: string | null;
};

const formatKRW = (v: number) => `${v.toLocaleString()}원`;

// 🔹 DEV/PROD 공통 API base URL
const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export default function CartQuotation({
  extraPackaging,
  insurance,
  onCheckout,
}: CartQuotationProps) {
  const [estimate, setEstimate] = useState<CartEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const subtotal = estimate
    ? estimate.productTotalKRW +
      estimate.serviceFeeKRW +
      estimate.totalShippingFeeKRW
    : 0;

  // 🔸 extraPackaging / insurance 바뀔 때마다 실제 견적 API 호출
  useEffect(() => {
    const fetchEstimate = async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const payload = {
          extraPackaging,
          insurance,
        };

        const finalUrl = buildApiUrl("/api/cart/estimate");
        console.log("[CartQuotation] POST /api/cart/estimate:", finalUrl);

        const res = await fetch(finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error("견적 계산 요청 실패");
        }

        const json = (await res.json()) as CartEstimateApiResponse;

        if (!json.success || !json.data) {
          throw new Error(json.error || "견적 계산 실패");
        }

        setEstimate(json.data);
      } catch (e: any) {
        console.error(e);
        setEstimate(null);
        setErrorMsg(e?.message ?? "견적 정보를 불러오지 못했습니다.");
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

      {/* 에러 / 견적 없음 */}
      {!isLoading && !estimate && (
        <p className="text-sm text-[#767676] mt-2">
          {errorMsg ?? "견적 정보를 불러오지 못했습니다."
        }</p>
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
          <div className="space-y-3 text-sm mt-2">
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
            disabled={isLoading || !estimate}
            className="w-full mt-3 py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] shadow-lg hover:shadow-xl transition-all duration-300 font-[600] flex justify-between items-center disabled:opacity-60"
          >
            <span className="text-sm text-[#505050]">총 결제 예상 금액</span>
            <span className="text-base font-[700] text-[#111111]">
              {formatKRW(estimate.grandTotalKRW)}
            </span>
          </motion.button>
        </>
      )}
    </motion.div>
  );
}
