import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion } from "motion/react";
import sampleimg from "../assets/cuteeeee.png";

type OrderItem = {
  id: number;
  productName: string;
  price: number;
  quantity: number;
  imageUrl?: string;
};

type ShippingInfo = {
  domestic: number;
  international: number;
};

type OrderDetail = {
  orderId: string;
  receiver: string;
  phone: string;
  postalCode: string;
  roadAddress: string;
  detailAddress: string;
  deliveryRequest?: string;
  paymentMethod: string | null;

  productTotalKRW: number;
  serviceFeeKRW: number;

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
  totalAmount: number;

  items: OrderItem[];
  shipping: ShippingInfo;
};

type OrderDetailApiResponse = {
  success: boolean;
  data: OrderDetail | null;
  error: string | null;
};

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

//localStorage 키
const RECEIVER_NAME_KEY = "buylink_receiverName";
const RECEIVER_PHONE_KEY = "buylink_receiverPhone";

// 유틸 함수
const formatKRW = (v?: number | null) => `${(v ?? 0).toLocaleString()}원`;

export default function OrderCompletePage() {
  const navigate = useNavigate();
  const params = useParams<{ orderId?: string }>();
  const location = useLocation();

  const orderIdFromParams = params.orderId;
  const locationState = location.state as
    | { orderId?: string; receiver?: string; phone?: string }
    | undefined;
  const orderIdFromState = locationState?.orderId;

  const effectiveOrderId = orderIdFromParams ?? orderIdFromState ?? "";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!effectiveOrderId) {
          setLoadError("주문 번호가 없습니다. 다시 시도해 주세요.");
          setLoading(false);
          return;
        }

        setLoading(true);
        setLoadError(null);

        console.log("[OrderCompletePage] effectiveOrderId:", effectiveOrderId);

        // 1) state에서 receiver / phone 우선
        const receiverFromState = locationState?.receiver ?? null;
        const phoneFromState = locationState?.phone ?? null;

        // 2) localStorage에서 보조로 사용
        const receiverFromStorage =
          typeof window !== "undefined"
            ? window.localStorage.getItem(RECEIVER_NAME_KEY)
            : null;
        const phoneFromStorage =
          typeof window !== "undefined"
            ? window.localStorage.getItem(RECEIVER_PHONE_KEY)
            : null;

        const receiverForQuery = receiverFromState ?? receiverFromStorage ?? "";
        const phoneForQuery = phoneFromState ?? phoneFromStorage ?? "";

        console.log("[OrderCompletePage] receiverForQuery:", receiverForQuery);
        console.log("[OrderCompletePage] phoneForQuery:", phoneForQuery);

        const searchParams = new URLSearchParams();
        if (receiverForQuery) searchParams.append("receiver", receiverForQuery);
        if (phoneForQuery) searchParams.append("phone", phoneForQuery);

        let url = buildApiUrl(`/api/orders/${effectiveOrderId}`);
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;

        console.log("[OrderCompletePage] GET /api/orders URL:", url);

        const res = await fetch(url, {
          method: "GET",
          credentials: "include",
        });

        console.log(
          "[OrderCompletePage] /api/orders status:",
          res.status,
          res.statusText
        );

        if (!res.ok) {
          const text = await res.text();
          console.log("[OrderCompletePage] /api/orders error body:", text);
          throw new Error(
            `주문 상세 조회 실패 (status ${res.status}): ${text}`
          );
        }

        const json: OrderDetailApiResponse = await res.json();
        console.log("[OrderCompletePage] /api/orders response json:", json);

        if (!json.success || !json.data) {
          throw new Error(json.error ?? "주문 상세 응답이 올바르지 않습니다.");
        }

        setOrder(json.data);
      } catch (e) {
        console.error("[OrderCompletePage] fetchOrder error:", e);
        setLoadError(
          e instanceof Error
            ? e.message
            : "주문 정보를 불러오는 중 문제가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [effectiveOrderId, locationState]);

  const handleCopyOrderId = () => {
    if (!order) return;
    navigator.clipboard.writeText(String(order.orderId));
    alert("주문번호가 복사되었어요!");
  };

  const handleGoHome = () => navigate("/");
  const handleRequestMore = () => navigate("/request");

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

  const subtotal =
    (order.productTotalKRW ?? 0) +
    (order.serviceFeeKRW ?? 0) +
    (order.totalShippingFeeKRW ?? 0);

  return (
    <motion.main
      key="order-complete"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 bg-white"
    >
      {/* 타이틀 */}
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

      {/* 상단 버튼 박스 */}
      <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 mb-6 text-center">
        <button
          onClick={handleRequestMore}
          className="w-full py-4 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold hover:brightness-95"
        >
          추가로 구매대행 요청
        </button>
      </section>

      <div className="grid lg:grid-cols-[2fr,1fr] gap-6 lg:gap-8">
        {/* LEFT */}
        <div className="space-y-6">
          {/* 주문정보 */}
          <section className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm space-y-2">
            <p className="text-[#767676]">주문 상세 내역</p>

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
            <h2 className="mb-3 text-lg font-semibold text-[#111111]">배송지</h2>

            <p>받는 분: {order.receiver}</p>
            <p>연락처: {order.phone}</p>
            <p>
              주소: ({order.postalCode}) {order.roadAddress}{" "}
              {order.detailAddress}
            </p>

            {order.deliveryRequest && (
              <p>요청사항: {order.deliveryRequest}</p>
            )}
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
                      {formatKRW(item.price)}
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
            <p className="text-[#111111]">
              {order.paymentMethod ?? "결제 수단 정보 없음"}
            </p>
          </section>
        </div>

        {/* RIGHT – 결제 금액 섹션 */}
        <aside className="space-y-6">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 text-sm space-y-3">
            <h2 className="text-lg font-semibold text-[#111111] mb-2">
              결제 금액
            </h2>

            {/* 1) 상품/수수료/배송비 */}
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[#505050]">상품 금액</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.productTotalKRW)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505050]">대행 수수료</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.serviceFeeKRW)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505050]">해외+국내 배송비</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.totalShippingFeeKRW)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505050]">합배송비</span>
                <span className="text-[#111111] font-medium">-</span>
              </div>
            </div>

            <div className="h-px bg-[#e5e5ec]" />

            {/* 2) 합계액 */}
            <div className="flex justify-between">
              <span className="text-[#111111] font-medium">합계액</span>
              <span className="text-[#ffcc4c] font-semibold">
                {formatKRW(subtotal)}
              </span>
            </div>

            {/* 3) 결제 수수료 / 옵션 비용 */}
            <div className="space-y-3 text-sm mt-2">
              <div className="flex justify-between">
                <span className="text-[#505050]">+ 결제 수수료(3.4%)</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.paymentFeeKRW)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505050]">+ [선택] 추가 포장 비용</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.extraPackagingFeeKRW)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#505050]">
                  + [선택] 해외 배송 보상 보험료
                </span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(order.insuranceFeeKRW)}
                </span>
              </div>
            </div>

            <div className="h-px bg-[#e5e5ec]" />

            {/* 4) 최종 결제 금액 */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-[#505050]">최종 결제 금액</span>
              <span className="text-lg font-bold text-[#111111]">
                {formatKRW(order.grandTotalKRW)}
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