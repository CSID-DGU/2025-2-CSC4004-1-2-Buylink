import { useState } from "react";
import { validateAddress, type AddressFormValues } from "../../utils/validation";

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export type AddressResult = {
  roadAddress: string;
  jibunAddress: string;
  zipCode: string;
};

export type SavedAddress = {
  id: number;
  receiverName: string;
  phone: string;
  postalCode: string;
  roadAddress: string;
  detailAddress: string;
  deliveryRequest: string;
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

export default function AddressModal({
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

      if (!res.ok) throw new Error("주소 검색 실패");

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

      if (!res.ok) throw new Error("배송지 등록 요청 실패");

      const json = (await res.json()) as OrdersAddressApiResponse;

      if (json.success && json.data) {
        onSaved(json.data);

        window.localStorage.setItem("buylink_addressId", String(json.data.id));
        window.localStorage.setItem(
          "buylink_receiverName",
          json.data.receiverName
        );
        window.localStorage.setItem("buylink_receiverPhone", json.data.phone);
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg border text-sm">
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
