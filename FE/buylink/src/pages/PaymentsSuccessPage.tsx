// src/pages/PaymentsSuccessPage.tsx
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "motion/react";

// 결제 검증 응답 타입 (/api/orders/pay)
type OrdersPayResponse = {
  paymentId: string;
  status: "SUCCESS" | "FAIL";
  paidAt?: string;
};

// 주문 생성 응답 타입 (/api/orders)
type CreateOrderResponse = {
  orderId: number;
  totalAmount: number;
  status: "PAID" | "PENDING" | "CANCELLED";
};

// 🔹 DEV/PROD 공통 API base URL
const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export default function PaymentsSuccessPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(location.search);

    const paymentKey = qs.get("paymentKey");
    const orderIdFromToss = qs.get("orderId"); // Checkout에서 넘긴 orderId
    const amountStr = qs.get("amount");

    if (!paymentKey || !orderIdFromToss || !amountStr) {
      setErrorMsg("필수 결제 정보가 누락되었습니다.");
      setIsProcessing(false);
      return;
    }

    const amount = Number(amountStr);

    const run = async () => {
      try {
        // ─────────────────────────────
        // 1) 결제 검증 단계 (/api/orders/pay)
        //    - Toss에서 넘겨준 orderId 그대로 string으로 전달
        //    - paymentKey도 함께 보내서 백엔드에서 Toss confirm 호출할 수 있게
        // ─────────────────────────────

        const payUrl = buildApiUrl("/api/orders/pay");
        console.log("[PaymentsSuccessPage] POST /api/orders/pay:", payUrl);

        const payRes = await fetch(payUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            orderId: orderIdFromToss, // ↔ Checkout에서 넘긴 ORDER-xxxx 그대로
            method: "TOSS_PAY",
            amount,
            paymentKey,
          }),
        });

        if (!payRes.ok) {
          throw new Error("결제 검증 요청 실패");
        }

        const payJson: OrdersPayResponse = await payRes.json();

        if (payJson.status !== "SUCCESS") {
          throw new Error("결제 승인에 실패했습니다.");
        }

        // ─────────────────────────────
        // 2) 주문 생성 단계 (/api/orders)
        //    cartItems / addressId / customsCode 는
        //    실제론 장바구니·체크아웃 상태에서 가져와야 함.
        //    지금은 TODO 그대로 두고, 백엔드 스펙에 맞춰 채워넣으면 됨.
        // ─────────────────────────────

        const cartItems: any[] = []; // TODO: 전역 상태(장바구니)에서 실제 아이템 목록 가져오기
        const addressId = 0; // TODO: CheckoutPage에서 선택한 주소 id
        const customsCode = ""; // TODO: CheckoutPage에서 입력한 개인통관고유번호

        const orderUrl = buildApiUrl("/api/orders");
        console.log("[PaymentsSuccessPage] POST /api/orders:", orderUrl);

        const orderRes = await fetch(orderUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            cartItems,
            addressId,
            customsCode,
            paymentInfo: {
              paymentId: payJson.paymentId,
              status: payJson.status,
              paidAt: payJson.paidAt,
              method: "TOSS_PAY",
              amount,
            },
          }),
        });

        if (!orderRes.ok) {
          throw new Error("주문 생성 요청 실패");
        }

        const orderJson: CreateOrderResponse = await orderRes.json();

        // ─────────────────────────────
        // 3) 주문완료 페이지로 이동
        // ─────────────────────────────
        const finalOrderId = orderJson.orderId;

        navigate("/order-complete", {
          replace: true,
          state: {
            orderId: finalOrderId,
          },
        });
      } catch (e) {
        console.error(e);
        setErrorMsg("결제 처리 중 오류가 발생했습니다.");
      } finally {
        setIsProcessing(false);
      }
    };

    run();
  }, [location.search, navigate]);

  return (
    <motion.main
      key="payments-success"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-[60vh] flex items-center justify-center bg-white px-4"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-center space-y-4">
        <h1 className="text-xl font-semibold text-[#111111]">
          결제 결과 처리 중입니다
        </h1>

        {isProcessing && (
          <p className="text-sm text-[#767676]">
            잠시만 기다려 주세요. 결제 내역을 확인하고 주문을 생성하고 있어요.
          </p>
        )}

        {!isProcessing && errorMsg && (
          <>
            <p className="text-sm text-[#ff4c4c]">{errorMsg}</p>
            <button
              onClick={() => navigate("/cart")}
              className="mt-3 w-full py-3 rounded-xl bg-[#ffe788] text-sm font-semibold text-[#111111]"
            >
              장바구니로 돌아가기
            </button>
          </>
        )}
      </div>
    </motion.main>
  );
}
