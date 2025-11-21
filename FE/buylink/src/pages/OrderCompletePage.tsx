// src/pages/OrderCompletePage.tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import sampleimg from "../assets/cuteeeee.png";

// =============================
// 타입 정의
// =============================
type OrderItem = {
  id: number;
  productName: string;
  priceKRW: number;
  quantity: number;
  imageUrl?: string;
};

type ShippingInfo = {
  domestic: number;
  international: number;
};

type OrderDetail = {
  orderId: number;
  receiver: string;
  receiverPhone?: string;
  address?: string;
  paymentMethod: string;
  totalAmount: number;
  items: OrderItem[];
  shipping: ShippingInfo;
  createdAt?: string;
};

// 🔹 GET /api/orders/{orderId} 응답
type OrderDetailApiResponse = OrderDetail;

// 🔹 POST /api/orders 요청/응답 (다른 페이지에서 사용할 템플릿용)
type CreateOrderApiRequest = {
  cartItems: any[];
  addressId: number;
  customsCode: string;
  paymentInfo: any;
};

type CreateOrderApiResponse = {
  orderId: number;
  totalAmount: number;
  status: "PAID" | "PENDING" | "FAILED";
};

// 🔹 POST /api/orders/pay 요청/응답 (다른 페이지에서 사용할 템플릿용)
type PayApiRequest = {
  orderId: number;
  method: "TOSS_PAY" | "CARD" | "BANK_TRANSFER" | string;
  amount: number;
};

type PayApiResponse = {
  paymentId: string;
  status: "SUCCESS" | "FAIL";
  paidAt: string;
};

// =============================
// 🔥 목업 데이터 (이제 사용 X, 참고용으로만 보관)
// =============================
/*
const MOCK_ORDER_DETAIL: OrderDetail = {
  orderId: 20251024723840,
  receiver: "홍길동",
  receiverPhone: "010-1234-5678",
  address: "[02000] 서울특별시 중구 퇴계로 265, B205",
  paymentMethod: "네이버페이-KB카드(일시불)",
  totalAmount: 14440,
  createdAt: "2025-07-25T12:34:56",
  items: [
    {
      id: 1,
      productName: "상품명은 최대 1줄 노출 상품명은 최대 1줄 노출...",
      priceKRW: 8000,
      quantity: 1,
      imageUrl: sampleimg,
    },
    {
      id: 2,
      productName: "상품명은 최대 1줄 노출 상품명은 최대 1줄 노출...",
      priceKRW: 8000,
      quantity: 1,
      imageUrl: sampleimg,
    },
  ],
  shipping: {
    domestic: 2900,
    international: 3540,
  },
};
*/

// =============================
// 유틸 함수
// =============================
const formatKRW = (v: number) => `${v.toLocaleString()}원`;

const formatOrderDate = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}.${mm}.${dd}`;
};

// =============================
// 메인 컴포넌트
// =============================
export default function OrderCompletePage() {
  const navigate = useNavigate();
  const params = useParams<{ orderId?: string }>();
  const location = useLocation();

  // /order-complete/:orderId or navigate(..., { state: { orderId } })
  const orderIdFromParams = params.orderId ? Number(params.orderId) : undefined;
  const orderIdFromState =
    (location.state as { orderId?: number } | undefined)?.orderId;

  // 👉 이제는 목업 기본값 없이, 둘 다 없으면 에러 처리
  const effectiveOrderId = orderIdFromParams ?? orderIdFromState;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // =============================
  // 주문 상세 조회 – 실제 API 사용
  // =============================
  useEffect(() => {
    const fetchOrder = async () => {
      if (!effectiveOrderId) {
        setOrder(null);
        setLoadError("주문 번호 정보가 없습니다.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setLoadError(null);

        // GET /api/orders/{orderId}
        const res = await fetch(`/api/orders/${effectiveOrderId}`, {
          method: "GET",
        });

        if (!res.ok) {
          throw new Error("주문 상세 조회 실패");
        }

        const data = (await res.json()) as OrderDetailApiResponse;
        setOrder(data);
      } catch (e) {
        console.error(e);
        setLoadError("주문 정보를 불러오는 중 문제가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [effectiveOrderId]);

  const handleCopyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(String(order.orderId));
    alert("주문번호가 복사되었어요!");
  };

  const handleGoHome = () => navigate("/");

  const handleRequestMore = () => {
    // 추가 구매대행 요청 – FE 전용 리다이렉트
    window.location.href = "/redirect/products/fetch";

    // 필요하면 실제 GET 호출 후 백엔드에서 302 리다이렉트 처리:
    /*
    fetch("/redirect/products/fetch", { method: "GET" });
    */
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <p className="text-sm text-[#505050]">불러오는 중...</p>
      </main>
    );
  }

  if (!order || loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full text-center border border-gray-200">
          <p className="text-sm text-[#505050] mb-4">
            {loadError ?? "주문 정보를 찾을 수 없습니다."}
          </p>
          <button
            onClick={handleGoHome}
            className="w-full py-3 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold"
          >
            홈으로 가기
          </button>
        </div>
      </main>
    );
  }

  const productTotal = order.items.reduce(
    (sum, item) => sum + item.priceKRW * item.quantity,
    0
  );
  const shippingTotal = order.shipping.domestic + order.shipping.international;
  const discount = productTotal + shippingTotal - order.totalAmount;
  const orderDateLabel = formatOrderDate(order.createdAt) || "";

  return (
    <motion.main
      key="order-complete"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white"
    >
      {/* 타이틀 (주문내역이라고 크게) */}
      <h2 className="text-2xl lg:text-3xl font-bold text-[#111111] mb-2">
        주문내역
      </h2>

      {/* 주문 완료 문구 */}
      <h1 className="text-center text-2xl lg:text-3xl font-bold text-[#111111] mb-2">
        주문 완료!
      </h1>
      <p className="text-center text-sm text-[#767676] mb-6">
        주문내역을 확인하려면 주문번호를 복사해두세요.
      </p>

      {/* 상단 주문 완료 박스 */}
      <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 mb-6 text-center">
        <button
          onClick={handleRequestMore}
          className="w-full py-4 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold hover:brightness-95"
        >
          추가로 구매대행 요청
        </button>
      </section>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6 lg:gap-8">
        {/* ======================
            LEFT CONTENT
        ====================== */}
        <div className="space-y-6">
          {/* 주문정보 */}
          <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm space-y-2">
            <p className="text-[#767676]">
              주문 상세 내역 - {orderDateLabel}
            </p>

            <p className="text-lg font-semibold text-[#111111]">
              주문 번호{" "}
              <button
                onClick={handleCopyOrderId}
                className="text-[#111111] font-medium underline underline-offset-2"
              >
                {order.orderId}
              </button>
            </p>
          </section>

          {/* 배송지 */}
          <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm space-y-1">
            <h2 className="mb-3 text-lg font-semibold text-[#111111]">
              배송지
            </h2>
            <p>받는 분: {order.receiver}</p>
            {order.receiverPhone && <p>연락처: {order.receiverPhone}</p>}
            {order.address && <p>주소: {order.address}</p>}
          </section>

          {/* 구매대행 상품 */}
          <section className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-[#111111]">
                구매대행 상품
              </h2>
              <span className="text-xs text-[#767676]">
                {order.items.length}건
              </span>
            </div>

            <div className="space-y-4">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border border-[#f1f1f5] rounded-xl p-3"
                >
                  <img
                    src={item.imageUrl ?? sampleimg}
                    alt={item.productName}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 text-sm">
                    <p className="font-medium text-[#111111] line-clamp-2">
                      {item.productName}
                    </p>
                    <p className="mt-1 text-[#111111] font-semibold">
                      {formatKRW(item.priceKRW)}
                    </p>
                    <p className="mt-1 text-xs text-[#767676]">
                      수량: {item.quantity}개
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 결제 수단 */}
          <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm">
            <h2 className="text-lg font-semibold text-[#111111] mb-2">
              결제 수단
            </h2>
            <p className="text-[#111111]">{order.paymentMethod}</p>
          </section>
        </div>

        {/* ======================
            RIGHT CONTENT (Summary)
        ====================== */}
        <aside className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm space-y-3">
            <h2 className="text-lg font-semibold text-[#111111] mb-2">
              결제 금액
            </h2>
            <div className="flex justify-between">
              <span className="text-[#505050]">상품 금액</span>
              <span className="text-[#111111] font-medium">
                {formatKRW(productTotal)}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#505050]">할인 금액</span>
              <span className="text-[#ff4c4c] font-medium">
                {discount > 0
                  ? `-${Math.abs(discount).toLocaleString()}원`
                  : "0원"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-[#505050]">배송비</span>
              <span className="text-[#111111] font-medium">
                {formatKRW(shippingTotal)}
              </span>
            </div>

            <div className="h-px bg-[#e5e5ec] my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#505050]">총 결제 금액</span>
              <span className="text-xl font-bold text-[#111111]">
                {formatKRW(order.totalAmount)}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleRequestMore}
              className="w-full py-5 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold hover:brightness-95"
            >
              추가로 구매대행 요청
            </button>

            <button
              onClick={handleGoHome}
              className="w-full py-5 rounded-xl border border-[#e5e5ec] bg-white text-[#505050] text-sm font-medium hover:bg-[#f9f9fb]"
            >
              홈으로 가기
            </button>
          </div>
        </aside>
      </div>
    </motion.main>
  );
}

/*
=============================
추가: CheckoutPage 등에서 쓸 수 있는
주문 생성 / 결제 요청 / 배송지 변경 API 템플릿 예시
=============================

// 주문 생성: POST /api/orders
async function createOrder(
  body: CreateOrderApiRequest
): Promise<CreateOrderApiResponse> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("주문 생성 실패");
  }

  return (await res.json()) as CreateOrderApiResponse;
}

// 결제 요청: POST /api/orders/pay
async function requestOrderPay(body: PayApiRequest): Promise<PayApiResponse> {
  const res = await fetch("/api/orders/pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("결제 요청 실패");
  }

  return (await res.json()) as PayApiResponse;
}

// 배송지 변경: PUT /api/orders/{orderId}/address
async function updateOrderAddress(orderId: number, address: string, phone: string) {
  const res = await fetch(`/api/orders/${orderId}/address`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, phone }),
  });

  if (!res.ok) {
    throw new Error("배송지 변경 실패");
  }

  return await res.json(); // { message: "배송지 변경 완료" }
}
*/
