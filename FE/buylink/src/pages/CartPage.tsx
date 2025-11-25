// src/pages/CartPage.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Plus, X } from "lucide-react";
import CartQuotation from "../components/CartQuotation";

type CartItem = {
  id: number;
  productName: string;
  priceKRW: number;
  quantity: number;
  imageUrl: string;
  selected: boolean;
  aiWeightKg?: number;
  aiVolumeM3?: number;
};

// /api/cart GET 응답 스펙
type CartApiItem = {
  id: number;
  productName: string;
  priceKRW: number;
  imageUrl: string;
  aiWeightKg: number;
  aiVolumeM3: number;
};

type CartApiGetResponse = {
  success: boolean;
  data: {
    items: CartApiItem[];
    totalKRW: number;
  } | null;
  error: string | null;
};

// 🔹 DEV/PROD 공통 API base URL
const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export default function CartPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<CartItem[]>([]);
  const [extraPackaging, setExtraPackaging] = useState(true);
  const [insurance, setInsurance] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const selectedItems = items.filter((i) => i.selected);

  // --------------------------------------------------------
  // 실제 장바구니 조회: GET /api/cart
  // --------------------------------------------------------
  useEffect(() => {
    const fetchCartFromServer = async () => {
      setIsLoading(true);
      try {
        const finalUrl = buildApiUrl("/api/cart");
        console.log("[CartPage] GET /api/cart:", finalUrl);

        const res = await fetch(finalUrl, {
          method: "GET",
          credentials: "include",
        });

        if (!res.ok) throw new Error("장바구니 조회 실패");

        const json = (await res.json()) as CartApiGetResponse;
        console.log("[CartPage] /api/cart response:", json);

        if (!json.success || !json.data)
          throw new Error(json.error ?? "장바구니 데이터가 없습니다.");

        setItems(
          json.data.items.map((item) => ({
            id: item.id,
            productName: item.productName,
            priceKRW: item.priceKRW,
            quantity: 1,
            imageUrl: item.imageUrl,
            selected: true,
            aiWeightKg: item.aiWeightKg,
            aiVolumeM3: item.aiVolumeM3,
          }))
        );
      } catch (e) {
        console.error("[CartPage] fetchCartFromServer error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCartFromServer();
  }, []);

  // --------------------------------------------------------
  // 선택/토글/삭제
  // --------------------------------------------------------
  const handleToggleAll = () => {
    const allSelected = items.every((i) => i.selected);
    setItems((prev) => prev.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleToggleOne = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  // 선택 삭제: DELETE /api/cart?ids=1,3,7
  const handleDeleteSelected = async () => {
    const ids = selectedItems.map((i) => i.id);
    if (ids.length === 0) {
      alert("삭제할 상품을 선택해주세요.");
      return;
    }

    try {
      const query = ids.join(",");
      const finalUrl = buildApiUrl(`/api/cart?ids=${encodeURIComponent(query)}`);
      console.log("[CartPage] DELETE /api/cart (selected):", finalUrl);

      const res = await fetch(finalUrl, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("선택 상품 삭제 실패");

      const json = await res.json();
      console.log("[CartPage] delete selected result:", json);

      setItems((prev) => prev.filter((i) => !ids.includes(i.id)));
    } catch (e) {
      console.error("[CartPage] handleDeleteSelected error:", e);
      alert("선택 상품 삭제 중 문제가 발생했습니다.");
    }
  };

  // 개별 삭제: DELETE /api/cart?ids=1
  const handleDeleteOne = async (id: number) => {
    try {
      const finalUrl = buildApiUrl(`/api/cart?ids=${id}`);
      console.log("[CartPage] DELETE /api/cart (one):", finalUrl);

      const res = await fetch(finalUrl, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error("상품 삭제 실패");

      const json = await res.json();
      console.log("[CartPage] delete one result:", json);

      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      console.error("[CartPage] handleDeleteOne error:", e);
      alert("상품 삭제 중 문제가 발생했습니다.");
    }
  };

  const handleGoRequestPage = () => navigate("/request");

  // --------------------------------------------------------
  // 결제 버튼
  // --------------------------------------------------------
  const handleGoCheckoutPage = () => {
    if (selectedItems.length === 0) {
      alert("결제할 상품을 선택해주세요.");
      return;
    }

    navigate("/checkout");
  };

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------
  return (
    <motion.main
      key="cart"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white"
    >
      <h1 className="text-2xl lg:text-3xl font-bold text-[#111111] mb-6">장바구니</h1>

      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* 왼쪽: 상품 리스트 */}
        <div className="lg:col-span-2 flex flex-col lg:pr-2">
          {/* 전체 선택 */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  className="w-5 h-5 accent-[#ffcc4c]"
                  checked={items.length > 0 && items.every((i) => i.selected)}
                  onChange={handleToggleAll}
                />
                <span className="text-sm lg:text-base text-[#111111]">
                  전체 선택
                </span>
              </div>

              <button
                onClick={handleDeleteSelected}
                className="text-sm underline text-[#111111] hover:text-[#505050]"
              >
                선택 상품 삭제
              </button>
            </div>
          </div>

          {/* 상품 리스트 */}
          <div className="space-y-6 lg:overflow-y-auto lg:max-h-[60vh] lg:pr-1">
            {isLoading && (
              <p className="text-sm text-[#767676] px-2 py-4">
                장바구니를 불러오는 중입니다...
              </p>
            )}

            {!isLoading &&
              items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl shadow p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <input
                      type="checkbox"
                      className="w-5 h-5 accent-[#ffcc4c] mt-0.5"
                      checked={item.selected}
                      onChange={() => handleToggleOne(item.id)}
                    />

                    <button onClick={() => handleDeleteOne(item.id)}>
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="flex gap-4 mb-3">
                    <img
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-[#111111]">
                        {item.productName}
                      </p>
                      <p className="mt-1 font-semibold text-[#111111]">
                        {item.priceKRW.toLocaleString()}원
                      </p>
                    </div>
                  </div>

                  {/* 수량 */}
                  <div className="bg-[#f7f7fb] rounded-lg p-3">
                    <p className="text-sm text-[#505050]">
                      <span className="font-semibold text-[#111111]">수량: </span>
                      {item.quantity}개
                    </p>
                  </div>

                  {/* AI 예측 무게/부피 카드 */}
                  {typeof item.aiWeightKg === "number" &&
                    typeof item.aiVolumeM3 === "number" && (
                      <div className="mt-2 bg-[#f7f7fb] rounded-lg p-3">
                        <p className="text-xs text-[#505050]">
                          <span className="font-semibold text-[#111111]">
                            예측 무게:&nbsp;
                          </span>
                          {item.aiWeightKg.toFixed(2)} kg
                        </p>
                        <p className="mt-1 text-xs text-[#505050]">
                          <span className="font-semibold text-[#111111]">
                            예측 부피:&nbsp;
                          </span>
                          {item.aiVolumeM3.toFixed(4)} m³
                        </p>
                      </div>
                    )}
                </div>
              ))}

            {!isLoading && items.length === 0 && (
              <p className="text-sm text-[#767676] px-2 py-4">
                장바구니에 담긴 상품이 없습니다.
              </p>
            )}
          </div>

          {/* 상품 추가 버튼 */}
          <div className="mt-4">
            <button
              onClick={handleGoRequestPage}
              className="w-full bg-white rounded-2xl shadow p-6 border border-gray-200 flex flex-col items-center gap-3"
            >
              <div className="w-8 h-8 bg-[#ffcc4c]/20 rounded-full flex items-center justify-center">
                <Plus className="w-5 h-5 text-[#ffcc4c]" />
              </div>
              <p className="text-gray-600">상품 추가하고 배송비 절약하기</p>
            </button>
          </div>
        </div>

        {/* 오른쪽: 옵션 + 견적 */}
        <div className="space-y-4 lg:self-start text-sm">
          <div className="bg-white rounded-2xl shadow p-4 border border-gray-200 space-y-4">
            {/* 포장 옵션 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-[#111111] text-sm">
                  추가 포장 비용
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] bg-[#f1f1f5] text-[#111111] font-[500]">
                  필수
                </span>
              </div>
              <p className="text-xs text-[#767676] mb-2">
                선택하지 않을 시, 일본 판매자가 보낸 패키지 그대로 발송됩니다.
              </p>
              <div className="space-y-1.5">
                <label
                  onClick={() => setExtraPackaging(true)}
                  className="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                      {extraPackaging && (
                        <div className="w-2 h-2 bg-[#ffe788] rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-[#505050]">추가 포장 비용</span>
                  </div>
                  <span className="text-xs text-[#111111] font-[500]">
                    +2,000원
                  </span>
                </label>

                <label
                  onClick={() => setExtraPackaging(false)}
                  className="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                      {!extraPackaging && (
                        <div className="w-2 h-2 bg-[#ffe788] rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-[#505050]">필요 없어요</span>
                  </div>
                  <span className="text-xs text-[#111111] font-[500]">0원</span>
                </label>
              </div>
            </div>

            {/* 보험 옵션 */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-[#111111] text-sm">
                  해외 배송 보상 보험료
                </h3>
                <span className="px-2 py-0.5 rounded text-[11px] bg-[#f1f1f5] text-[#111111] font-[500]">
                  필수
                </span>
              </div>
              <p className="text-xs text-[#767676] mb-2">
                본 서비스는 선택 상품입니다. 분실·파손 시 일부 또는 전액 보상을 위한 보험료입니다.
              </p>
              <div className="space-y-1.5">
                <label
                  onClick={() => setInsurance(true)}
                  className="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                      {insurance && (
                        <div className="w-2 h-2 bg-[#ffe788] rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-[#505050]">보험 가입</span>
                  </div>
                  <span className="text-xs text-[#111111] font-[500]">
                    +500원
                  </span>
                </label>

                <label
                  onClick={() => setInsurance(false)}
                  className="flex justify-between items-center px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 rounded-full flex items-center justify-center">
                      {!insurance && (
                        <div className="w-2 h-2 bg-[#ffe788] rounded-full" />
                      )}
                    </div>
                    <span className="text-xs text-[#505050]">필요 없어요</span>
                  </div>
                  <span className="text-xs text-[#111111] font-[500]">0원</span>
                </label>
              </div>
            </div>
          </div>

          <CartQuotation
            extraPackaging={extraPackaging}
            insurance={insurance}
            onCheckout={handleGoCheckoutPage}
          />
        </div>
      </div>
    </motion.main>
  );
}
