import { atom } from "recoil";
import sampleimg from "../assets/cuteeeee.png";

export type PackagingOption = "yes" | "no";
export type InsuranceOption = "yes" | "no";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image: string;
  selected: boolean;
  status: "ready" | "soldout" | "processing" | "done";
  option?: string;
}

// 🔹 장바구니 아이템 상태 (초기값은 UI 확인용 목업)
export const cartItemsState = atom<CartItem[]>({
  key: "cartItemsState",
  default: [
    {
      id: 1,
      name: "몬치치 마스코트 키체인 3",
      price: 11990,
      quantity: 1,
      image: sampleimg,
      selected: true,
      status: "ready",
      option: "선택지 A/선택지 ①",
    },
    {
      id: 2,
      name: "상품명은 최대 1줄 노출 길어지면 말줄임",
      price: 8000,
      quantity: 1,
      image: sampleimg,
      selected: true,
      status: "ready",
      option: "선택지 A/선택지 ①",
    },
  ],
});

// 🔹 추가 포장 옵션
export const selectedPackagingState = atom<PackagingOption>({
  key: "selectedPackagingState",
  default: "yes",
});

// 🔹 보험 옵션
export const selectedInsuranceState = atom<InsuranceOption>({
  key: "selectedInsuranceState",
  default: "yes",
});
