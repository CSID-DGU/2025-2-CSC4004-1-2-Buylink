import { atom } from "recoil";

export interface PredictedItem {
  weight: number;  // kg
  volume: number;  // m³
}

export const predictedState = atom<PredictedItem[]>({
  key: "predictedState",
  default: [],
});
