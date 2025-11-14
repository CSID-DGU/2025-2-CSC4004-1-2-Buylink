// src/pages/CartPage.tsx
import { motion } from "motion/react";
import { Plus, X, Info } from "lucide-react";
import { useRecoilState } from "recoil";
import {
  cartItemsState,
  selectedPackagingState,
  selectedInsuranceState,
} from "../recoil/cartState";
import { useNavigate } from "react-router-dom";

export default function CartPage() {
  const [cartItems, setCartItems] = useRecoilState(cartItemsState);
  const [selectedPackaging, setSelectedPackaging] = useRecoilState(
    selectedPackagingState
  );
  const [selectedInsurance, setSelectedInsurance] = useRecoilState(
    selectedInsuranceState
  );

  const navigate = useNavigate();

  const handleToggleAll = () => {
    const allSelected = cartItems.every((item) => item.selected);
    setCartItems(cartItems.map((item) => ({ ...item, selected: !allSelected })));
  };

  const handleToggleOne = (id: number) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleDeleteSelected = () => {
    setCartItems(cartItems.filter((item) => !item.selected));
  };

  const handleDeleteOne = (id: number) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  const handleGoRequestPage = () => {
    navigate("/request"); // 🔸 “상품 추가하고 배송비 절약하기” 버튼 클릭 시
  };

  const handleGoCheckoutPage = () => {
    navigate("/checkout"); // 🔸 “결제하기” / “xx원 결제하기” 버튼 클릭 시
  };

  return (
    <motion.main
      key="cart"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12"
    >
      <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Cart Items - Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg p-6 border border-[#e5e5ec]/50"
          >
            <div className="flex items-center justify-between">
              <motion.div
                className="flex items-center gap-3 cursor-pointer"
                onClick={handleToggleAll}
                whileHover={{ x: 4 }}
              >
                <div className="w-5 h-5 rounded bg-[#ffe788] border border-[#e5e5ec] shadow-sm flex items-center justify-center">
                  {cartItems.length > 0 &&
                    cartItems.every((item) => item.selected) && (
                      <img
                        src="data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%2013%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20id%3D%22Vector%22%20d%3D%22M11.6667%201L4.33333%208.33333L1%205%22%20stroke%3D%22%23111111%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%3C%2Fsvg%3E%0A"
                        alt="check"
                        className="w-3 h-3"
                      />
                    )}
                </div>
                <p className="text-[#111111] font-[500]">전체 선택</p>
              </motion.div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={handleDeleteSelected}
                className="text-[#111111] text-sm underline hover:text-[#505050]"
              >
                선택 상품 삭제
              </motion.button>
            </div>
          </motion.div>

          {/* Status Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-[#fff5c9] to-[#ffe788]/30 rounded-2xl shadow-md p-6 border border-[#ffe788]/50"
          >
            <p className="text-center text-[#111111] mb-4 font-[500]">
              지금 바로 주문 가능해요
            </p>
            <div className="space-y-2 text-center">
              <p className="text-[#111111] font-[500]">주문일: 25.09.07</p>
              <p className="text-[#767676] text-sm">
                ⏰ 결제 가능 기한: 25.09.08 23:59 까지
              </p>
            </div>
          </motion.div>

          {/* Cart Items */}
          {cartItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (index + 2) }}
              whileHover={{ y: -4 }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border border-[#e5e5ec]/50"
            >
              <div className="flex items-start justify-between mb-4">
                <motion.div
                  className="w-5 h-5 rounded bg-[#ffe788] border border-[#e5e5ec] shadow-sm cursor-pointer flex items-center justify-center"
                  onClick={() => handleToggleOne(item.id)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {item.selected && (
                    <img
                      src="data:image/svg+xml,%3Csvg%20preserveAspectRatio%3D%22none%22%20width%3D%22100%25%22%20height%3D%22100%25%22%20overflow%3D%22visible%22%20style%3D%22display%3A%20block%3B%22%20viewBox%3D%220%200%2013%2010%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%0A%3Cpath%20id%3D%22Vector%22%20d%3D%22M11.6667%201L4.33333%208.33333L1%205%22%20stroke%3D%22%23111111%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%0A%3C%2Fsvg%3E%0A"
                      alt="check"
                      className="w-3 h-3"
                    />
                  )}
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleDeleteOne(item.id)}
                  className="text-[#767676] hover:text-[#111111]"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="flex gap-4 mb-4">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="relative w-16 h-16 lg:w-20 lg:h-20 rounded-xl overflow-hidden shadow-md flex-shrink-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm text-[#111111] mb-2">{item.name}</p>
                  <p className="text-[#111111] font-[500]">
                    {item.price.toLocaleString()}원
                  </p>
                </div>
              </div>

              <div className="bg-[#f7f7fb] rounded-lg p-3">
                <p className="text-sm">
                  <span className="text-[#111111] font-[500]">수량: </span>
                  <span className="text-[#767676]">{item.quantity}개</span>
                </p>
              </div>
            </motion.div>
          ))}

          {/* Add More Products */}
          <motion.button
            whileHover={{ scale: 1.01, y: -2 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleGoRequestPage}
            className="w-full bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[#e5e5ec] flex flex-col items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-[#ffcc4c]/20 flex items-center justify-center">
              <Plus className="w-5 h-5 text-[#ffcc4c]" />
            </div>
            <p className="text-[#505050]">상품 추가하고 배송비 절약하기</p>
          </motion.button>
        </div>

        {/* Summary - Right Column */}
        <div className="space-y-6">
          {/* Additional Options */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[#e5e5ec]/50 space-y-6"
          >
            {/* 포장 옵션 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[#111111] font-[600]">추가 포장 비용</h3>
                <span className="px-2 py-1 bg-[#f1f1f5] rounded text-xs text-[#111111] font-[500]">
                  필수
                </span>
              </div>
              <div className="space-y-3">
                <motion.label
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedPackaging("yes")}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f7f7fb] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center border-[#e5e5ec]`}
                    >
                      {selectedPackaging === "yes" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffe788]" />
                      )}
                    </div>
                    <span className="text-[#505050]">추가 포장 비용</span>
                  </div>
                  <span className="text-[#111111] font-[500]">+2,000원</span>
                </motion.label>
                <motion.label
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedPackaging("no")}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f7f7fb] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center border-[#e5e5ec]`}
                    >
                      {selectedPackaging === "no" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffe788]" />
                      )}
                    </div>
                    <span className="text-[#505050]">필요 없어요</span>
                  </div>
                  <span className="text-[#111111] font-[500]">0원</span>
                </motion.label>
              </div>
            </div>

            <div className="h-px bg-[#e5e5ec]" />

            {/* 보험 옵션 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-[#111111] font-[600]">
                  해외 배송 보상 보험료
                </h3>
                <span className="px-2 py-1 bg-[#f1f1f5] rounded text-xs text-[#111111] font-[500]">
                  필수
                </span>
              </div>
              <div className="space-y-3">
                <motion.label
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedInsurance("yes")}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f7f7fb] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center border-[#e5e5ec]`}
                    >
                      {selectedInsurance === "yes" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffe788]" />
                      )}
                    </div>
                    <span className="text-[#505050]">보험 가입</span>
                  </div>
                  <span className="text-[#111111] font-[500]">+500원</span>
                </motion.label>
                <motion.label
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedInsurance("no")}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-[#f7f7fb] cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center border-[#e5e5ec]`}
                    >
                      {selectedInsurance === "no" && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#ffe788]" />
                      )}
                    </div>
                    <span className="text-[#505050]">필요 없어요</span>
                  </div>
                  <span className="text-[#111111] font-[500]">0원</span>
                </motion.label>
              </div>
            </div>
          </motion.div>

          {/* Price Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-[#e5e5ec]/50 space-y-4 sticky top-24"
          >
            <h3 className="text-[#111111] font-[600]">견적서</h3>

            {(() => {
              const selectedItems = cartItems.filter((item) => item.selected);
              const itemsTotal = selectedItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );
              const serviceFee = 3000;
              const shippingFee = 9480;
              const subtotal = itemsTotal + serviceFee + shippingFee;
              const paymentFee = Math.round(subtotal * 0.034);
              const packagingFee = selectedPackaging === "yes" ? 2000 : 0;
              const insuranceFee = selectedInsurance === "yes" ? 500 : 0;
              const discount = 840 + 2000 + 500;
              const finalTotal =
                subtotal + paymentFee + packagingFee + insuranceFee - discount;

              const discountBase =
                subtotal + paymentFee + packagingFee + insuranceFee;
              const discountRate =
                discountBase > 0
                  ? ((discount / discountBase) * 100).toFixed(3)
                  : "0.000";

              return (
                <>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#505050]">상품 금액</span>
                      <span className="text-[#111111] font-[500]">
                        {itemsTotal.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#505050]">대행 수수료</span>
                      <span className="text-[#111111] font-[500]">
                        {serviceFee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#505050]">해외+국내 배송비</span>
                      <span className="text-[#111111] font-[500]">
                        {shippingFee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#505050]">합배송비</span>
                      <span className="text-[#111111] font-[500]">-</span>
                    </div>
                  </div>

                  <div className="h-px bg-[#e5e5ec]" />

                  <div className="flex justify-between">
                    <span className="text-[#111111] font-[500]">합계액</span>
                    <span className="text-[#ffcc4c] font-[600]">
                      {subtotal.toLocaleString()}원
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#505050]">
                        +결제 수수료(3.4%)
                      </span>
                      <span className="text-[#111111] font-[500]">
                        {paymentFee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#505050]">+추가 포장 비용</span>
                      <span className="text-[#111111] font-[500]">
                        {packagingFee.toLocaleString()}원
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#505050]">
                        +국내 배송 보상 보편초
                      </span>
                      <span className="text-[#111111] font-[500]">
                        {insuranceFee.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-[#e5e5ec]" />

                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <h4 className="text-[#111111] font-[600]">할인</h4>
                      <span className="text-[#ffcc4c] font-[600]">
                        {discountRate}%
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-[#505050]">
                          • 결제 수수료(4%)
                        </span>
                        <span className="text-[#111111] font-[500]">
                          840원
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050]">
                          • 다음 주기 국가 비용 미지원
                        </span>
                        <span className="text-[#111111] font-[500]">
                          2,000원
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#505050]">
                          • 다음 배송 통관 비용 보편초
                        </span>
                        <span className="text-[#111111] font-[500]">
                          500원
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-[#f7f7fb] to-[#fef9e7] rounded-xl p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#505050] font-[500]">
                        최종 결제 금액
                      </span>
                      <span className="text-xl text-[#111111] font-[700]">
                        {finalTotal.toLocaleString()}원
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoCheckoutPage}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] shadow-lg hover:shadow-xl transition-all duration-300 font-[600]"
                  >
                    {`${finalTotal.toLocaleString()}원 결제하기`}
                  </motion.button>
                </>
              );
            })()}

            <div className="flex items-start gap-2 p-3 bg-[#fff5c9]/50 rounded-lg">
              <Info className="w-4 h-4 text-[#ff9200] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#505050]">
                배송비는 실무게와 부피 무게 중 더 무거운 쪽으로 계산됩니다.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.main>
  );
}
