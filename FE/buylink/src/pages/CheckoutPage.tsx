// src/pages/CheckoutPage.tsx
import { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import CartQuotation from "../components/CartQuotation";

import ItemsList from "../components/checkout/ItemsList";
import AddressModal, { type SavedAddress } from "../components/modals/AddressModal";
import CustomsCodeModal, { type CustomsInfo } from "../components/modals/CustomsCodeModal";

import { useCheckoutCart } from "../hooks/checkout/useCheckoutCart";
import { useCheckoutPayment } from "../hooks/checkout/useCheckoutPayment";

type CheckoutNavState = {
  selectedIds?: number[];
  extraPackaging?: boolean;
  insurance?: boolean;
};

// 토스페이먼츠 테스트 클라이언트 키
const TOSS_CLIENT_KEY = "test_ck_kYG57Eba3GmNoeeGjpWErpWDOxmA";

export default function CheckoutPage() {
  const location = useLocation();
  const navState = (location.state as CheckoutNavState) ?? {};

  const selectedIdsFromCart = navState.selectedIds ?? [];

  const [agree, setAgree] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);

  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [customsInfo, setCustomsInfo] = useState<CustomsInfo | null>(null);

  const [isPaying, setIsPaying] = useState(false);

  // Cart에서 선택한 옵션도 유지
  const [extraPackaging] = useState(navState.extraPackaging ?? true);
  const [insurance] = useState(navState.insurance ?? true);

  const { orderItems, selectedItems, isLoadingOrder } =
    useCheckoutCart(selectedIdsFromCart);

  const { pay, getErrorMessage } = useCheckoutPayment(TOSS_CLIENT_KEY);

  const maskCustomsCode = (code: string) => {
    if (code.length <= 5) return code;
    return code.slice(0, 5) + "*".repeat(Math.max(0, code.length - 7)) + code.slice(-2);
  };

  const handlePay = async () => {
    if (isPaying) return;

    if (!savedAddress) {
      alert("배송지를 등록해 주세요.");
      return;
    }
    if (!customsInfo) {
      alert("개인통관고유번호를 등록해 주세요.");
      return;
    }
    if (!agree) {
      alert("주문정보 확인 및 약관에 동의해 주세요.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("결제할 상품이 없습니다. 장바구니에서 상품을 선택해 주세요.");
      return;
    }

    setIsPaying(true);
    try {
      await pay({
        itemIds: selectedItems.map((x) => x.id),
        extraPackaging,
        insurance,
        customerName: savedAddress.receiverName,
      });
    } catch (e) {
      console.error(e);
      alert(`결제창을 닫았거나 오류가 발생했습니다.\n${getErrorMessage(e)}`);
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <motion.main
      key="checkout"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white"
    >
      <h1 className="text-2xl lg:text-3xl font-bold text-[#111111] mb-6">
        주문/결제
      </h1>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6 lg:gap-8">
        {/* LEFT */}
        <section className="space-y-6">
          {/* 배송지 */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#111111]">배송지</h2>

              <button
                onClick={() => setAddressModalOpen(true)}
                className="text-sm text-[#111111] font-medium hover:underline"
              >
                등록
              </button>
            </div>

            {savedAddress ? (
              <div className="text-sm leading-relaxed text-[#111111]">
                <p>{savedAddress.receiverName}</p>
                <p>{savedAddress.phone}</p>
                <p>{savedAddress.roadAddress}</p>
                <p>{savedAddress.detailAddress}</p>
                <p className="text-[#767676] mt-2">{savedAddress.deliveryRequest}</p>
              </div>
            ) : (
              <div className="border border-dashed border-[#e5e5ec] rounded-xl py-6 px-4 text-sm text-[#767676] text-center">
                배송지를 등록해 주세요.
              </div>
            )}
          </div>

          {/* 개인통관고유번호 */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#111111]">개인통관고유번호</h2>
              <button
                type="button"
                onClick={() => {
                  if (!savedAddress) {
                    alert("배송지를 먼저 등록해 주세요.");
                    return;
                  }
                  setCustomsModalOpen(true);
                }}
                className="px-4 py-3 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold hover:brightness-95 transition"
              >
                10초만에 조회하기
              </button>
            </div>

            {customsInfo && savedAddress ? (
              <div className="text-sm leading-relaxed text-[#111111] space-y-1">
                <p className="font-medium">{savedAddress.receiverName} 님</p>
                <p className="text-[#505050]">
                  개인통관고유번호: {maskCustomsCode(customsInfo.code)}
                </p>
              </div>
            ) : (
              <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
                개인통관고유번호를 등록해 주세요.
              </div>
            )}
          </div>

          {/* 구매대행 상품 */}
          <ItemsList orderItems={orderItems} isLoadingOrder={isLoadingOrder} />

          {/* 약관 */}
          <div className="bg-white rounded-2xl shadow p-5 border border-gray-200 text-xs text-[#505050]">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 w-4 h-4 border-[#d1d1e0]"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                [필수] 주문한 상품의 결제, 배송, 주문정보를 확인하였으며 이에 동의합니다.
              </span>
            </label>
          </div>
        </section>

        {/* RIGHT – CartQuotation 재사용 */}
        <aside className="space-y-4">
          {isLoadingOrder ? (
            <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
              <p className="text-sm text-[#767676]">결제 금액을 계산 중입니다...</p>
            </div>
          ) : (
            <CartQuotation
              extraPackaging={extraPackaging}
              insurance={insurance}
              selectedItems={selectedItems}
              onCheckout={() => void handlePay()}
            />
          )}

          {isPaying && (
            <p className="text-xs text-[#767676] text-center">결제창을 여는 중입니다...</p>
          )}
        </aside>
      </div>

      {addressModalOpen && (
        <AddressModal
          onClose={() => setAddressModalOpen(false)}
          onSaved={(addr) => {
            setSavedAddress(addr);
            setAddressModalOpen(false);
          }}
        />
      )}

      {customsModalOpen && (
        <CustomsCodeModal
          onClose={() => setCustomsModalOpen(false)}
          onVerified={(info) => {
            setCustomsInfo(info);
            setCustomsModalOpen(false);
          }}
        />
      )}
    </motion.main>
  );
}
