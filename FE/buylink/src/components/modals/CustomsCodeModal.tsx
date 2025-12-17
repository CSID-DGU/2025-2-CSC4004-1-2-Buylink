// src/components/modals/CustomsCodeModal.tsx
import { useState } from "react";
import { validateCustomsCode } from "../../utils/validation";

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export type CustomsInfo = { code: string };

type CustomsVerifyResponse = {
  isValid: boolean;
  name: string;
};

export default function CustomsCodeModal({
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
      console.log("[CustomsCodeModal] POST /api/orders/customs-code/verify:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
        credentials: "include",
      });

      if (!res.ok) throw new Error("개인통관고유번호 검증 요청 실패");

      const json = (await res.json()) as CustomsVerifyResponse;

      if (json.isValid) {
        onVerified({ code: trimmed });
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
