import { useEffect, useState } from "react";
import { motion } from "motion/react";
import sampleimg from "../assets/cuteeeee.png";
import {
  validateAddress,
  type AddressFormValues,
  validateCustomsCode,
} from "../utils/validation";

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, options: any) => Promise<void>;
    };
  }
}

// 토스페이먼츠 테스트 클라이언트 키
const TOSS_CLIENT_KEY = "test_ck_kYG57Eba3GmNoeeGjpWErpWDOxmA";

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

type OrderItem = {
  id: number;
  productName: string;
  priceKRW: number;
  quantity: number;
  imageUrl: string;
};

type AddressResult = {
  roadAddress: string;
  jibunAddress: string;
  zipCode: string;
};

type SavedAddress = {
  id: number;
  receiverName: string;
  phone: string;
  postalCode: string;
  roadAddress: string;
  detailAddress: string;
  deliveryRequest: string;
};

type CustomsInfo = {
  code: string;
  //name: string;
};

type AddressSearchApiResponse = {
  success: boolean;
  data: {
    currentPage: number;
    countPerPage: number;
    totalCount: number;
    addresses: AddressResult[];
  } | null;
  error: string | null;
};

type OrdersAddressApiResponse = {
  success: boolean;
  data: SavedAddress | null;
  error: string | null;
};

type CustomsVerifyResponse = {
  isValid: boolean;
  name: string;
};

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

type CartEstimate = {
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
};

type CartEstimateApiResponse = {
  success: boolean;
  data: CartEstimate | null;
  error: string | null;
};

const formatKRW = (v?: number | null) => `${(v ?? 0).toLocaleString()}원`;

export default function CheckoutPage() {
  const [agree, setAgree] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);

  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [customsInfo, setCustomsInfo] = useState<CustomsInfo | null>(null);

  const [isPaying, setIsPaying] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [estimate, setEstimate] = useState<CartEstimate | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  // 주문/견적 불러오기
  useEffect(() => {
    const fetchOrderAndEstimate = async () => {
      setIsLoadingOrder(true);
      try {
        // 1) 장바구니 아이템 불러오기 GET /api/cart
        const cartUrl = buildApiUrl("/api/cart");
        console.log("[CheckoutPage] GET /api/cart:", cartUrl);

        const cartRes = await fetch(cartUrl, {
          method: "GET",
          credentials: "include",
        });

        if (!cartRes.ok) {
          throw new Error("장바구니 조회 실패");
        }

        const cartJson = (await cartRes.json()) as CartApiGetResponse;
        console.log("[CheckoutPage] /api/cart response:", cartJson);

        if (!cartJson.success || !cartJson.data) {
          throw new Error(cartJson.error ?? "장바구니 데이터가 없습니다.");
        }

        const mappedItems: OrderItem[] = cartJson.data.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          priceKRW: item.priceKRW,
          quantity: 1,
          imageUrl: item.imageUrl,
        }));
        setOrderItems(mappedItems);

        const itemIds = mappedItems.map((item) => item.id);

        // 2) 견적 불러오기
        const estimateUrl = buildApiUrl("/api/cart/estimate");
        console.log("[CheckoutPage] POST /api/cart/estimate:", estimateUrl);

        const estimateRes = await fetch(estimateUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemIds, // 장바구니에서 가져온 id 배열
            extraPackaging: true,
            insurance: true,
          }),
          credentials: "include",
        });

        if (!estimateRes.ok) {
          throw new Error("견적 계산 요청 실패");
        }

        const estimateJson =
          (await estimateRes.json()) as CartEstimateApiResponse;
        console.log(
          "[CheckoutPage] /api/cart/estimate response:",
          estimateJson
        );

        if (!estimateJson.success || !estimateJson.data) {
          throw new Error(estimateJson.error ?? "견적 계산 실패");
        }

        setEstimate(estimateJson.data);
      } catch (e) {
        console.error("[CheckoutPage] fetchOrderAndEstimate error:", e);
        setOrderItems([]);
        setEstimate(null);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchOrderAndEstimate();
  }, []);

  // 결제 금액
  const productTotal = orderItems.reduce(
    (sum, item) => sum + item.priceKRW * item.quantity,
    0
  );

  const fallbackTotal = productTotal;
  const totalAmount = estimate ? estimate.grandTotalKRW : fallbackTotal;

  const subtotal = estimate
    ? estimate.productTotalKRW +
      estimate.serviceFeeKRW +
      estimate.totalShippingFeeKRW
    : fallbackTotal;

  const maskCustomsCode = (code: string) => {
    if (code.length <= 5) return code;
    return (
      code.slice(0, 5) + "*".repeat(Math.max(0, code.length - 7)) + code.slice(-2)
    );
  };

  // 결제 버튼 클릭
  const handlePay = async () => {
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
    if (!totalAmount || totalAmount <= 0) {
      alert("결제할 상품 또는 금액 정보가 유효하지 않습니다.");
      return;
    }

    setIsPaying(true);

    try {
      if (!window.TossPayments) {
        alert(
          "결제 모듈이 로드되지 않았습니다. index.html에 TossPayments 스크립트가 추가되어 있는지 확인해 주세요."
        );
        return;
      }

      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);
      const orderId = `ORDER-${Date.now()}`;

      await tossPayments.requestPayment("CARD", {
        amount: totalAmount,
        orderId,
        orderName: "BuyLink 구매대행 결제",
        customerName: savedAddress.receiverName,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
      });
    } catch (error: any) {
      console.error(error);
      alert(
        `결제창을 닫았거나 오류가 발생했습니다.\n${error?.message ?? ""}`
      );
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
                <p className="text-[#767676] mt-2">
                  {savedAddress.deliveryRequest}
                </p>
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
              <h2 className="text-lg font-semibold text-[#111111]">
                개인통관고유번호
              </h2>
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
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                구매대행 상품
              </h2>
              <span className="text-xs text-[#767676]">
                {orderItems.length}건
              </span>
            </div>

            {isLoadingOrder ? (
              <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
                결제할 상품 정보를 불러오는 중입니다...
              </div>
            ) : orderItems.length === 0 ? (
              <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
                결제할 상품이 없습니다. 장바구니에서 상품을 담아주세요.
              </div>
            ) : (
              <div className="space-y-4">
                {orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 border border-[#f1f1f5] rounded-xl p-3"
                  >
                    <img
                      src={item.imageUrl || sampleimg}
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
            )}
          </div>

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
                [필수] 주문한 상품의 결제, 배송, 주문정보를 확인하였으며 이에
                동의합니다.
              </span>
            </label>
          </div>
        </section>

        {/* RIGHT – 결제 금액 */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 space-y-3">
            <h2 className="text-lg font-semibold text-[#111111] mb-2">
              결제 금액
            </h2>

            {isLoadingOrder ? (
              <p className="text-sm text-[#767676] mt-2">
                결제 금액을 계산 중입니다...
              </p>
            ) : !estimate ? (
              <>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#505050]">상품 금액</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(productTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">배송비</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(0)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-[#e5e5ec] my-2" />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#505050]">총 결제 금액</span>
                  <span className="text-xl font-bold text-[#111111]">
                    {formatKRW(totalAmount)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#505050]">상품 금액</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.productTotalKRW)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">대행 수수료</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.serviceFeeKRW)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">해외+국내 배송비</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.totalShippingFeeKRW)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">합배송비</span>
                    <span className="text-[#111111] font-medium">-</span>
                  </div>
                </div>

                <div className="h-px bg-[#e5e5ec]" />

                <div className="flex justify-between">
                  <span className="text-[#111111] font-medium">합계액</span>
                  <span className="text-[#ffcc4c] font-semibold">
                    {formatKRW(subtotal)}
                  </span>
                </div>

                <div className="space-y-3 text-sm mt-2">
                  <div className="flex justify-between">
                    <span className="text-[#505050]">+ 결제 수수료(3.4%)</span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.paymentFeeKRW)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">
                      + [선택] 추가 포장 비용
                    </span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.extraPackagingFeeKRW)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#505050]">
                      + [선택] 해외 배송 보상 보험료
                    </span>
                    <span className="text-[#111111] font-medium">
                      {formatKRW(estimate.insuranceFeeKRW)}
                    </span>
                  </div>
                </div>

                <div className="h-px bg-[#e5e5ec]" />

                <div className="flex justify-between items-center">
                  <span className="text-sm text-[#505050]">
                    최종 결제 금액
                  </span>
                  <span className="text-lg font-bold text-[#111111]">
                    {formatKRW(estimate.grandTotalKRW)}
                  </span>
                </div>
              </>
            )}
          </div>

          <button
            onClick={handlePay}
            disabled={isPaying || isLoadingOrder}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {isPaying
              ? "결제 처리 중..."
              : `${formatKRW(totalAmount)} 결제하기`}
          </button>
        </aside>
      </div>

      {/* 배송지 등록 모달 */}
      {addressModalOpen && (
        <AddressModal
          onClose={() => setAddressModalOpen(false)}
          onSaved={(addr) => {
            setSavedAddress(addr);
            setAddressModalOpen(false);
          }}
        />
      )}

      {/* 개인통관고유번호 모달 */}
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

// 배송지 등록 모달
function AddressModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: (addr: SavedAddress) => void;
}) {
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [roadAddress, setRoadAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [detailAddress, setDetailAddress] = useState("");
  const [deliveryRequest, setDeliveryRequest] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      const url = buildApiUrl(
        `/api/address/search?keyword=${encodeURIComponent(query)}`
      );
      console.log("[AddressModal] GET /api/address/search:", url);

      const res = await fetch(url, { method: "GET", credentials: "include" });

      if (!res.ok) {
        throw new Error("주소 검색 실패");
      }

      const json = (await res.json()) as AddressSearchApiResponse;

      if (json.success && json.data) {
        setSearchResults(json.data.addresses);
      } else {
        alert(json.error ?? "주소 검색에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("주소 검색 중 문제가 발생했습니다.");
    }
  };

  const handleSubmit = async () => {
    const values: AddressFormValues = {
      receiverName: receiverName.trim(),
      phone: phone.trim(),
      roadAddress: roadAddress.trim(),
      postalCode: postalCode.trim(),
      detailAddress: detailAddress.trim(),
      deliveryRequest: deliveryRequest.trim(),
    };

    const errors = validateAddress(values);
    const firstError = Object.values(errors).find((msg) => msg);

    if (firstError) {
      alert(firstError);
      return;
    }

    const payload: Omit<SavedAddress, "id"> = {
      receiverName: values.receiverName,
      phone: values.phone,
      postalCode: values.postalCode,
      roadAddress: values.roadAddress,
      detailAddress: values.detailAddress,
      deliveryRequest: values.deliveryRequest,
    };

    try {
      const url = buildApiUrl("/api/orders/address");
      console.log("[AddressModal] POST /api/orders/address:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("배송지 등록 요청 실패");
      }

      const json = (await res.json()) as OrdersAddressApiResponse;

      if (json.success && json.data) {
        onSaved(json.data);

        window.localStorage.setItem("buylink_addressId", String(json.data.id));
        window.localStorage.setItem(
          "buylink_receiverName",
          json.data.receiverName
        );
        window.localStorage.setItem(
          "buylink_receiverPhone",
          json.data.phone
        );
      } else {
        alert(json.error ?? "배송지 등록에 실패했습니다.");
      }
    } catch (e) {
      console.error(e);
      alert("배송지 등록 중 문제가 발생했습니다.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#111111]">배송지 등록</h2>

        <input
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder="이름"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주소 검색"
            className="flex-1 border rounded-lg px-4 py-2 text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-[#ffe788] rounded-lg text-xs font-semibold"
          >
            검색
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
            {searchResults.map((addr, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setRoadAddress(addr.roadAddress);
                  setPostalCode(addr.zipCode);
                }}
                className="w-full text-left p-2 border rounded hover:bg-gray-50 text-sm"
              >
                {addr.roadAddress} ({addr.zipCode})
              </button>
            ))}
          </div>
        )}

        <input
          value={roadAddress}
          readOnly
          placeholder="도로명 주소"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <input
          value={postalCode}
          readOnly
          placeholder="우편번호"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <input
          value={detailAddress}
          onChange={(e) => setDetailAddress(e.target.value)}
          placeholder="상세 주소"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <input
          value={deliveryRequest}
          onChange={(e) => setDeliveryRequest(e.target.value)}
          placeholder="요청사항"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            닫기
          </button>

          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#ffe788] rounded-lg text-sm font-semibold"
          >
            배송지 등록하기
          </button>
        </div>
      </div>
    </div>
  );
}

// 개인통관고유번호 모달
function CustomsCodeModal({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: (info: CustomsInfo) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    const trimmed = code.trim();

    const validationError = validateCustomsCode(trimmed);
    if (validationError) {
      alert(validationError);
      return;
    }

    setLoading(true);
    try {
      const url = buildApiUrl("/api/orders/customs-code/verify");
      console.log(
        "[CustomsCodeModal] POST /api/orders/customs-code/verify:",
        url
      );

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("개인통관고유번호 검증 요청 실패");
      }

      const json = (await res.json()) as CustomsVerifyResponse;

      if (json.isValid) {
        onVerified({ code: trimmed});
        window.localStorage.setItem("buylink_customsCode", trimmed);
      } else {
        alert("올바르지 않은 번호입니다. 다시 확인해주세요.");
      }
    } catch (e) {
      console.error(e);
      alert("조회 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#111111]">
          개인통관고유번호 조회
        </h2>

        <p className="text-xs text-[#767676]">
          P로 시작하는 13자리 개인통관고유번호를 입력해 주세요.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="예: P123456789012"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg border text-sm disabled:opacity-60"
          >
            취소
          </button>

          <button
            onClick={handleVerify}
            disabled={loading}
            className="px-4 py-2 bg-[#ffe788] rounded-lg text-sm font-semibold disabled:opacity-60"
          >
            {loading ? "조회 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}