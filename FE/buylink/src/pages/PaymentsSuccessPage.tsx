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

// 🔥 예전 목업 데이터 (지금은 사용 X, 참고용으로만 남겨둠)
/*
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
*/

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

        const payRes = await fetch("/api/orders/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            // ⚠️ 백엔드에서 기대하는 주문번호 규칙에 맞게 조정 필요
            orderId: Number(orderIdFromToss),
            method: "TOSS_PAY",
            amount,
            // 필요하다면 paymentKey도 같이 보내서
            // 백엔드에서 Toss 서버에 /v1/payments/confirm 호출하게 하면 됨
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

        // ─────────────────────────────
        // 2) 주문 생성 단계 (/api/orders)
        //    cartItems / addressId / customsCode 는
        //    실제론 장바구니·체크아웃 상태에서 가져와야 함.
        //    여기서는 빈 값으로만 보내고, 주석으로 TODO 남김.
        // ─────────────────────────────

        const cartItems: any[] = []; // TODO: 전역 상태(장바구니)에서 실제 아이템 목록 가져오기
        const addressId = 0; // TODO: CheckoutPage에서 선택한 주소 id
        const customsCode = ""; // TODO: CheckoutPage에서 입력한 개인통관고유부호

        const orderRes = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
