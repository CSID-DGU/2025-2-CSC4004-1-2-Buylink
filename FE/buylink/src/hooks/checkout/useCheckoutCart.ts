import { useEffect, useMemo, useState } from "react";

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";
const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

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

export type OrderItem = {
  id: number;
  productName: string;
  priceKRW: number;
  quantity: number;
  imageUrl: string;
};

export function useCheckoutCart(selectedIdsFromCart: number[]) {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  useEffect(() => {
    const fetchCart = async () => {
      setIsLoadingOrder(true);
      try {
        const cartUrl = buildApiUrl("/api/cart");
        console.log("[useCheckoutCart] GET /api/cart:", cartUrl);

        const cartRes = await fetch(cartUrl, {
          method: "GET",
          credentials: "include",
        });

        if (!cartRes.ok) throw new Error("장바구니 조회 실패");

        const cartJson = (await cartRes.json()) as CartApiGetResponse;
        console.log("[useCheckoutCart] /api/cart response:", cartJson);

        if (!cartJson.success || !cartJson.data) {
          throw new Error(cartJson.error ?? "장바구니 데이터가 없습니다.");
        }

        const mapped: OrderItem[] = cartJson.data.items.map((item) => ({
          id: item.id,
          productName: item.productName,
          priceKRW: item.priceKRW,
          quantity: 1,
          imageUrl: item.imageUrl,
        }));

        const filtered =
          selectedIdsFromCart.length > 0
            ? mapped.filter((it) => selectedIdsFromCart.includes(it.id))
            : mapped;

        setOrderItems(filtered);
      } catch (e) {
        console.error("[useCheckoutCart] fetchCart error:", e);
        setOrderItems([]);
      } finally {
        setIsLoadingOrder(false);
      }
    };

    fetchCart();
  }, [selectedIdsFromCart]);

  // CartQuotation에 넘길 선택 아이템(= 결제 대상)
  const selectedItems = useMemo(
    () => orderItems.map((it) => ({ id: it.id })),
    [orderItems]
  );

  return { orderItems, selectedItems, isLoadingOrder };
}
