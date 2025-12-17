import type { CartEstimate } from "../../components/CartQuotation";

type TossPaymentRequestOptions = {
  amount: number;
  orderId: string;
  orderName: string;
  customerName: string;
  successUrl: string;
  failUrl: string;
  [key: string]: unknown;
};

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment: (
        method: string,
        options: TossPaymentRequestOptions
      ) => Promise<void>;
    };
  }
}

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

type CartEstimateApiResponse = {
  success: boolean;
  data: CartEstimate | null;
  error: string | null;
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err && "message" in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === "string") return m;
  }
  return "";
}

export function useCheckoutPayment(tossClientKey: string) {
  const pay = async (args: {
    itemIds: number[];
    extraPackaging: boolean;
    insurance: boolean;
    customerName: string;
  }) => {
    // 1) 결제 직전 최종 견적 다시 확보(안전)
    const estimateUrl = buildApiUrl("/api/cart/estimate");
    console.log("[useCheckoutPayment] POST /api/cart/estimate:", estimateUrl);

    const estimateRes = await fetch(estimateUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itemIds: args.itemIds,
        extraPackaging: args.extraPackaging,
        insurance: args.insurance,
      }),
      credentials: "include",
    });

    if (!estimateRes.ok) throw new Error("견적 계산 요청 실패");

    const estimateJson = (await estimateRes.json()) as CartEstimateApiResponse;
    console.log("[useCheckoutPayment] /api/cart/estimate response:", estimateJson);

    if (!estimateJson.success || !estimateJson.data) {
      throw new Error(estimateJson.error ?? "견적 계산 실패");
    }

    const totalAmount = estimateJson.data.grandTotalKRW;
    if (!totalAmount || totalAmount <= 0) {
      throw new Error("결제할 금액 정보가 유효하지 않습니다.");
    }

    // 2) Toss 결제
    if (!window.TossPayments) {
      throw new Error(
        "결제 모듈이 로드되지 않았습니다. index.html에 TossPayments 스크립트가 추가되어 있는지 확인해 주세요."
      );
    }

    const tossPayments = window.TossPayments(tossClientKey);
    const orderId = `ORDER-${Date.now()}`;

    await tossPayments.requestPayment("CARD", {
      amount: totalAmount,
      orderId,
      orderName: "BuyLink 구매대행 결제",
      customerName: args.customerName,
      successUrl: `${window.location.origin}/payments/success`,
      failUrl: `${window.location.origin}/payments/fail`,
    });
  };

  return {
    pay,
    getErrorMessage,
  };
}
