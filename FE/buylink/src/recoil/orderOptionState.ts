import { atom } from "recoil";

export interface OrderOptions {
  packing: boolean;    // 추가 포장
  insurance: boolean;  // 해외 배송 보상 보험
}

export const orderOptionState = atom<OrderOptions>({
  key: "orderOptionState",
  default: {
    packing: false,
    insurance: false,
  },
});