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

// 👉 실제로는 cartItems, addressId, customsCode를
//     - localStorage
//     - Recoil / Context
//   등에서 가져와야 함. 여기선 목업만.
const MOCK_CART_ITEMS = [
  {
    id: 1,
    productName: "몬치치 키체인",
    priceKRW: 11990,
    quantity: 1,
    imageUrl: "https://.../photos/1.jpg",
  },
];

const MOCK_ADDRESS_ID = 10;
const MOCK_CUSTOMS_CODE = "P123456789012";

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
        // ─────────────────────────────

        // 🔥 현재: 목업 구현
        const mockPayRes: OrdersPayResponse = {
          paymentId: "tspay_20251024_0001",
          status: "SUCCESS",
          paidAt: "2025-10-24T15:21:00",
        };

        console.log("결제 검증 목업 응답:", {
          paymentKey,
          orderIdFromToss,
          amount,
          mockPayRes,
        });

        if (mockPayRes.status !== "SUCCESS") {
          throw new Error("결제 승인에 실패했습니다.");
        }

        // 🔁 나중에 실제 백엔드 연결 시
        /*
        const payRes = await fetch("/api/orders/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: Number(orderIdFromToss), // 백엔드에서 관리하는 주문번호 규칙에 맞게
            method: "TOSS_PAY",
            amount,
            // 실제 서비스라면 paymentKey도 같이 보내서
            // 백엔드에서 토스 서버에 /v1/payments/confirm 호출하게 하는 게 안전
            // paymentKey,
          }),
        });

        if (!payRes.ok) {
          throw new Error("결제 검증 요청 실패");
        }

        const payJson: OrdersPayResponse = await payRes.json();
        if (payJson.status !== "SUCCESS") {
          throw new Error("결제 승인에 실패했습니다.");
        }
        */

        // ─────────────────────────────
        // 2) 주문 생성 단계 (/api/orders)
        // ─────────────────────────────

        // 🔥 현재: 목업 구현
        const mockOrderRes: CreateOrderResponse = {
          orderId: 20251024723840,
          totalAmount: amount,
          status: "PAID",
        };

        console.log("주문 생성 목업 응답:", mockOrderRes);

        // 🔁 나중에 실제 백엔드 연결 시
        /*
        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cartItems: MOCK_CART_ITEMS,      // 실제로는 장바구니 상태에서 가져오기
            addressId: MOCK_ADDRESS_ID,      // CheckoutPage에서 선택한 주소 id
            customsCode: MOCK_CUSTOMS_CODE,  // CheckoutPage에서 입력한 개인통관부호
            paymentInfo: {
              // /api/orders/pay 응답 전체 or 필요한 필드
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
        */

        // ─────────────────────────────
        // 3) 주문완료 페이지로 이동
        // ─────────────────────────────

        // 여기서는 목업 orderId 사용
        const finalOrderId = mockOrderRes.orderId;

        // OrderCompletePage에서 useLocation().state?.orderId 로 쓸 수 있게 넘겨줌
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
