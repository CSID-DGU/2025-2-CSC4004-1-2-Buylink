import { atom } from "recoil";

export interface Product {
  success: boolean,
  productURL: string;
  productName: string;
  productDescription: string;
  priceKRW: number;
  hasShippingFee: boolean;
  category: string;
  imageUrls: string[];
  isSoldOut: boolean;
  quantity: number;
}

export const productState = atom<Product[] | null>({
  key: "productState",
  default: null,
});
