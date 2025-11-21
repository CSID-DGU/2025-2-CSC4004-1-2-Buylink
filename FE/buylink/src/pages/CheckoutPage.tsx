// src/pages/CheckoutPage.tsx
import { useState } from "react";
import { motion } from "motion/react";
import sampleimg from "../assets/cuteeeee.png";

// =============================
// TossPayments 전역 타입 선언
// =============================
declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (method: string, options: any) => Promise<void>;
    };
  }
}

// 🔹 토스페이먼츠 테스트 클라이언트 키 (프론트에서 써도 되는 키)
const TOSS_CLIENT_KEY = "test_ck_kYG57Eba3GmNoeeGjpWErpWDOxmA";

// =============================
// 타입
// =============================
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
  name: string;
};

// 🔹 /api/address/search 응답 타입
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

// 🔹 /api/orders/address 응답 타입
type OrdersAddressApiResponse = {
  success: boolean;
  data: SavedAddress | null;
  error: string | null;
};

// 🔹 /api/orders/customs-code/verify 응답 타입
type CustomsVerifyResponse = {
  isValid: boolean;
  name: string;
};

// 🔹 /api/orders/pay 응답 타입 (지금은 사용 X, 나중용)
/*
type OrdersPayResponse = {
  paymentId: string;
  status: "SUCCESS" | "FAIL";
  paidAt?: string;
};
*/

// =============================
// 🔥 목업 주문 상품 → 전부 주석 처리
// =============================
/*
const MOCK_ORDER_ITEMS: OrderItem[] = [
  {
    id: 1,
    productName: "몬치치 마스코트 키체인 3",
    priceKRW: 50,
    quantity: 1,
    imageUrl: sampleimg,
  },
  {
    id: 2,
    productName: "상품명은 최대 1줄 노출 길어지면 말줄임",
    priceKRW: 50,
    quantity: 1,
    imageUrl: sampleimg,
  },
];
*/

// 👉 실제에선 백엔드에서 주문/장바구니 데이터를 받아와 채울 예정
const ORDER_ITEMS: OrderItem[] = [];

const formatKRW = (v: number) => `${v.toLocaleString()}원`;

// ========================================
// 메인 컴포넌트
// ========================================
export default function CheckoutPage() {
  const [agree, setAgree] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);

  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [customsInfo, setCustomsInfo] = useState<CustomsInfo | null>(null);

  const [isPaying, setIsPaying] = useState(false);

  // ==============================
  // 결제 금액 (지금은 ORDER_ITEMS 기준, 비어있으면 0원)
  // ==============================
  const productTotal = ORDER_ITEMS.reduce(
    (sum, item) => sum + item.priceKRW * item.quantity,
    0
  );
  const discount = 0;
  const shippingFee = 0;
  const totalAmount = productTotal - discount + shippingFee;

  // 코드 일부 마스킹용 (P1234*****890 이런 느낌)
  const maskCustomsCode = (code: string) => {
    if (code.length <= 5) return code;
    return (
      code.slice(0, 5) + "*".repeat(Math.max(0, code.length - 7)) + code.slice(-2)
    );
  };

  // ==============================
  // 결제 버튼 클릭
  //  - 결제수단 선택 없이 바로 TossPayments 테스트 결제
  // ==============================
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

    setIsPaying(true);

    try {
      if (!window.TossPayments) {
        alert(
          "결제 모듈이 로드되지 않았습니다. index.html에 TossPayments 스크립트가 추가되어 있는지 확인해 주세요."
        );
        return;
      }

      const tossPayments = window.TossPayments(TOSS_CLIENT_KEY);

      // 실제 서비스에서 orderId는 백엔드에서 관리하는 유니크 값으로 맞추면 된다.
      const orderId = `ORDER-${Date.now()}`;

      await tossPayments.requestPayment("CARD", {
        // 간편결제(토스페이)도 보통 "CARD" 타입으로 호출
        amount: totalAmount,
        orderId,
        orderName: "BuyLink 구매대행 결제",
        customerName: savedAddress.receiverName,
        successUrl: `${window.location.origin}/payments/success`,
        failUrl: `${window.location.origin}/payments/fail`,
        // easyPay: "TOSSPAY", // 나중에 간편결제 종류까지 지정하고 싶으면 사용
      });

      // requestPayment 이후에는 success/fail URL로 리다이렉트된다.
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
        {/* =========================
            LEFT
        ========================== */}
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
                onClick={() => setCustomsModalOpen(true)}
                className="px-4 py-3 rounded-xl bg-[#ffe788] text-[#111111] text-sm font-semibold hover:brightness-95 transition"
              >
                10초만에 조회하기
              </button>
            </div>

            {customsInfo ? (
              <div className="text-sm leading-relaxed text-[#111111] space-y-1">
                <p className="font-medium">{customsInfo.name} 님</p>
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

          {/* 구매대행 상품 (지금은 ORDER_ITEMS 사용) */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                구매대행 상품
              </h2>
              <span className="text-xs text-[#767676]">
                {ORDER_ITEMS.length}건
              </span>
            </div>

            {ORDER_ITEMS.length === 0 ? (
              <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
                결제할 상품이 없습니다. 장바구니에서 상품을 담아주세요.
              </div>
            ) : (
              <div className="space-y-4">
                {ORDER_ITEMS.map((item) => (
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

        {/* =========================
            RIGHT
        ========================== */}
        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200 space-y-3">
            <h2 className="text-lg font-semibold text-[#111111] mb-2">
              결제 금액
            </h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#505050]">상품 금액</span>
                <span className="text-[#111111] font-medium">
                  {formatKRW(productTotal)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#505050]">할인 금액</span>
                <span className="text-[#ff4c4c] font-medium">0원</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#505050]">배송비</span>
                <span className="text-[#111111] font-medium">무료</span>
              </div>
            </div>

            <div className="h-px bg-[#e5e5ec] my-2" />

            <div className="flex justify-between items-center">
              <span className="text-sm text-[#505050]">총 결제 금액</span>
              <span className="text-xl font-bold text-[#111111]">
                {formatKRW(totalAmount)}
              </span>
            </div>
          </div>

          <button
            onClick={handlePay}
            disabled={isPaying}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-60"
          >
            {isPaying
              ? "결제 처리 중..."
              : `${formatKRW(totalAmount)} 결제하기`}
          </button>
        </aside>
      </div>

      {/* =============================
          배송지 등록 MODAL
      ============================== */}
      {addressModalOpen && (
        <AddressModal
          onClose={() => setAddressModalOpen(false)}
          onSaved={(addr) => {
            setSavedAddress(addr);
            setAddressModalOpen(false);
          }}
        />
      )}

      {/* =============================
          개인통관고유번호 MODAL
      ============================== */}
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

// ========================================
// 배송지 등록 모달
// ========================================
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

  // =============================
  // 🔥 (주석) 목업 주소 검색
  // =============================
  /*
  const mockAddressSearch = async (
    keyword: string
  ): Promise<AddressSearchApiResponse> => {
    console.log("주소 검색 키워드(목업):", keyword);

    return {
      success: true,
      data: {
        currentPage: 1,
        countPerPage: 10,
        totalCount: 1,
        addresses: [
          {
            roadAddress:
              "서울특별시 광진구 아차산로 549 (광장동, 광장현대파크빌)",
            jibunAddress: "서울특별시 광진구 광장동 577 광장현대파크빌",
            zipCode: "04983",
          },
        ],
      },
      error: null,
    };
  };
  */

  // =============================
  // 주소 검색 (실제 API 호출)
  // =============================
  const handleSearch = async () => {
    if (!query.trim()) return;

    try {
      const res = await fetch(
        `/api/address/search?query=${encodeURIComponent(query)}`,
        { method: "GET" }
      );

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

  // =============================
  // 🔥 (주석) 목업 배송지 등록
  // =============================
  /*
  const mockSaveAddress = async (
    payload: Omit<SavedAddress, "id">
  ): Promise<OrdersAddressApiResponse> => {
    console.log("배송지 등록 payload(목업):", payload);

    return {
      success: true,
      data: {
        id: 5,
        receiverName: payload.receiverName,
        phone: payload.phone,
        postalCode: payload.postalCode,
        roadAddress: payload.roadAddress,
        detailAddress: payload.detailAddress,
        deliveryRequest: payload.deliveryRequest,
      },
      error: null,
    };
  };
  */

  // =============================
  // 배송지 등록 (실제 API 호출)
  // =============================
  const handleSubmit = async () => {
    if (!receiverName || !phone || !roadAddress || !postalCode) {
      alert("이름, 전화번호, 주소, 우편번호를 입력해 주세요.");
      return;
    }

    const payload: Omit<SavedAddress, "id"> = {
      receiverName,
      phone,
      postalCode,
      roadAddress,
      detailAddress,
      deliveryRequest,
    };

    try {
      const res = await fetch("/api/orders/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("배송지 등록 요청 실패");
      }

      const json = (await res.json()) as OrdersAddressApiResponse;

      if (json.success && json.data) {
        onSaved(json.data);
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

        {/* 이름 */}
        <input
          value={receiverName}
          onChange={(e) => setReceiverName(e.target.value)}
          placeholder="이름"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        {/* 전화번호 */}
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="전화번호"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        {/* 주소 검색 */}
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

        {/* 검색 결과 */}
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
          onChange={(e) => setRoadAddress(e.target.value)}
          placeholder="도로명 주소"
          className="w-full border rounded-lg px-4 py-2 text-sm"
        />

        <input
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
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

// ========================================
// 개인통관고유번호 모달
// ========================================
function CustomsCodeModal({
  onClose,
  onVerified,
}: {
  onClose: () => void;
  onVerified: (info: CustomsInfo) => void;
}) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔥 (주석) 목업 검증 로직
  /*
  const mockVerifyCustomsCode = async (
    c: string
  ): Promise<CustomsVerifyResponse> => {
    console.log("개인통관고유번호 검증(목업):", c);

    // 간단하게 "P"로 시작하고 길이 13이면 유효하다고 가정
    if (c.startsWith("P") && c.length === 13) {
      return { isValid: true, name: "홍길동" };
    }
    return { isValid: false, name: "" };
  };
  */

  const handleVerify = async () => {
    if (!code.trim()) {
      alert("개인통관고유번호를 입력해 주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/orders/customs-code/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        throw new Error("개인통관고유번호 검증 요청 실패");
      }

      const json = (await res.json()) as CustomsVerifyResponse;

      if (json.isValid) {
        onVerified({ code: code.trim(), name: json.name });
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
