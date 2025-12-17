// src/components/checkout/ItemsList.tsx
import sampleimg from "../../assets/cuteeeee.png";
import { formatKRW } from "../../utils/money";
import type { OrderItem } from "../../hooks/checkout/useCheckoutCart";

export default function ItemsList({
  orderItems,
  isLoadingOrder,
}: {
  orderItems: OrderItem[];
  isLoadingOrder: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#111111]">구매대행 상품</h2>
        <span className="text-xs text-[#767676]">{orderItems.length}건</span>
      </div>

      {isLoadingOrder ? (
        <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
          결제할 상품 정보를 불러오는 중입니다...
        </div>
      ) : orderItems.length === 0 ? (
        <div className="border border-dashed border-[#e5e5ec] rounded-xl py-5 px-4 text-sm text-[#767676]">
          결제할 상품이 없습니다. 장바구니에서 상품을 선택해 주세요.
        </div>
      ) : (
        <div className="space-y-4">
          {orderItems.map((item) => (
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
  );
}
