import { useState } from "react";
import { motion } from "motion/react";
import sampleimg from "../assets/cuteeeee.png";

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

type PaymentMethodId =
  | "CARD"
  | "CHECK_CARD"
  | "BANK_TRANSFER"
  | "NAVER_PAY"
  | "TOSS_PAY";

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

// =============================
const MOCK_ORDER_ITEMS: OrderItem[] = [
  {
    id: 1,
    productName: "몬치치 마스코트 키체인 3",
    priceKRW: 11990,
    quantity: 1,
    imageUrl: sampleimg,
  },
  {
    id: 2,
    productName: "상품명은 최대 1줄 노출 길어지면 말줄임",
    priceKRW: 8000,
    quantity: 1,
    imageUrl: sampleimg,
  },
];

const PAYMENT_METHODS: { id: PaymentMethodId; label: string }[] = [
  { id: "CARD", label: "신용카드" },
  { id: "CHECK_CARD", label: "체크카드" },
  { id: "BANK_TRANSFER", label: "무통장 입금" },
  { id: "NAVER_PAY", label: "네이버페이" },
  { id: "TOSS_PAY", label: "토스페이" },
];

const formatKRW = (v: number) => `${v.toLocaleString()}원`;

// ========================================
// 메인 컴포넌트
// ========================================
export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>("TOSS_PAY");
  const [agree, setAgree] = useState(false);

  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);

  // 개인통관고유번호 모달 + 정보
  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [customsInfo, setCustomsInfo] = useState<CustomsInfo | null>(null);

  // ==============================
  // 결제 금액
  // ==============================
  const productTotal = MOCK_ORDER_ITEMS.reduce(
    (sum, item) => sum + item.priceKRW * item.quantity,
    0
  );
  const discount = 0;
  const shippingFee = 0;
  const totalAmount = productTotal - discount + shippingFee;

  // 코드 일부 마스킹용 (P1234*****890 이런 느낌)
  const maskCustomsCode = (code: string) => {
    if (code.length <= 5) return code;
    return code.slice(0, 5) + "*".repeat(Math.max(0, code.length - 7)) + code.slice(-2);
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

          {/* 구매대행 상품 */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#111111]">
                구매대행 상품
              </h2>
              <span className="text-xs text-[#767676]">
                {MOCK_ORDER_ITEMS.length}건
              </span>
            </div>

            <div className="space-y-4">
              {MOCK_ORDER_ITEMS.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-4 border border-[#f1f1f5] rounded-xl p-3"
                >
                  <img
                    src={item.imageUrl}
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
          </div>

          {/* 결제 수단 */}
          <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-[#111111] mb-4">
              결제 수단
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PAYMENT_METHODS.map((m) => {
                const selected = paymentMethod === m.id;

                return (
                  <button
                    key={m.id}
                    onClick={() => setPaymentMethod(m.id)}
                    type="button"
                    className={[
                      "w-full py-3.5 rounded-xl text-sm border transition-all",
                      selected
                        ? "border-[#ffcc4c] bg-[#fff7d6] text-[#111111] font-semibold shadow-sm"
                        : "border-[#e5e5ec] bg-[#fafafa] text-[#505050] hover:bg-[#f5f5f5]",
                    ].join(" ")}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
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

          <button className="w-full py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111111] font-semibold shadow-lg hover:shadow-xl transition-all">
            {`${formatKRW(totalAmount)} 결제하기`}
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
  onSaved: (addr: any) => void;
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
  // 주소 검색
  // =============================
  const handleSearch = async () => {
    if (!query.trim()) return;

    const res = await fetch("/api/address/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();
    if (json.success) {
      setSearchResults(json.data.addresses);
    }
  };

  // =============================
  // 배송지 등록
  // =============================
  const handleSubmit = async () => {
    const payload = {
      receiverName,
      phone,
      postalCode,
      roadAddress,
      detailAddress,
      deliveryRequest,
    };

    const res = await fetch("/api/orders/address", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (json.success) {
      onSaved(json.data);
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
        body: JSON.stringify({ code }),
      });

      const json: { isValid: boolean; name: string } = await res.json();

      if (json.isValid) {
        onVerified({ code, name: json.name });
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
