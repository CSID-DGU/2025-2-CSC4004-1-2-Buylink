import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useSetRecoilState } from "recoil";
import { productState, type Product } from "../recoil/productState.ts";
import { LinkIcon, X } from "lucide-react";
import imgSpinner from "../assets/spinner.gif";
import sampleimg from "../assets/cuteeeee.png";

export default function RequestPage() {
  const navigate = useNavigate();
  const setProductData = useSetRecoilState(productState);

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔸 상품 정보 리스트
  const [products, setProducts] = useState<Product[]>([]);

  // 🔸 체크된 상품 index
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

// --------------------------------------------------------
// 🔥 목업 데이터 (success 포함 → API 구조 그대로)
// --------------------------------------------------------
const mockFetchProduct = (url: string, soldout: boolean): Product => {
  return {
    success: true, // 🔥 여기 false → alert 뜸!
    productURL: url || "https://jp.mercari.com/item/m41121124914",
    productName: "예시 상품 이름",
    productDescription: "예시 상품 설명입니다. 상태 양호, 박스 포함.",
    priceKRW: 19900,
    hasShippingFee: true,
    category: "홈 > 장난감 > 피규어",
    imageUrls: [
      "https://static.mercdn.net/item/detail/orig/photos/m12345678901_1.jpg",
      "https://static.mercdn.net/item/detail/orig/photos/m12345678901_2.jpg",
    ],
    isSoldOut: soldout,
    quantity: 1,
  };
};

const handleLoadProduct = async () => {
  if (!urlInput.trim()) return;
  setIsLoading(true);

  try {
    const url = urlInput.trim();

    const sameCount = products.filter((p) => p.productURL === url).length;
    const isSoldOut = sameCount >= 1;

    // 🔥 mockFetchProduct가 Product 전체를 반환함
    const apiData = mockFetchProduct(url, isSoldOut);

    // 🚨 success:false → alert 출력 후 중단
    if (!apiData.success) {
      alert("유효하지 않은 URL입니다.");
      setIsLoading(false);
      return;
    }

    // 🔥 success:true 일 때만 추가됨
    setProducts((prev) => [...prev, apiData]);
    setUrlInput("");

  } catch (e) {
    console.error(e);
    alert("상품을 불러오는 중 문제가 발생했습니다.");
  } finally {
    setIsLoading(false);
  }
};

  const handleDelete = (index: number) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(index);
      return newSet;
    });
  };

  const handleToggleSelect = (index: number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(index) ? newSet.delete(index) : newSet.add(index);
      return newSet;
    });
  };

  const handleAddToCart = () => {
    // success=true 이고, soldOut 아닌 상품만 cart로 이동
    const selectedProducts = products.filter(
      (p, i) => selectedIds.has(i) && !p.isSoldOut
    );

    if (selectedProducts.length === 0) {
      alert("장바구니에 담을 상품을 선택하세요!");
      return;
    }

    // 🔥 Recoil에 최종 선택된 상품만 저장
    setProductData(selectedProducts);
    navigate("/cart");
  };

  // --------------------------------------------------------
  // UI 렌더링
  // --------------------------------------------------------
  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-10 bg-white">
      <motion.div
        initial={{ y: "30vh", opacity: 0 }}
        animate={{
          y: products.length > 0 ? 0 : "30vh",
          opacity: 1,
        }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
        className="w-full max-w-2xl text-center"
      >
        <h1 className="text-2xl font-bold text-[#111111] mb-6">
          구매대행 요청하기
        </h1>

        {/* URL 입력 박스 */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-300 p-6 mb-8 text-left">
          <h2 className="text-lg font-semibold mb-4">상품 추가</h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-[#767676] w-4 h-4" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="상품 링크(URL)를 입력하세요"
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[#DBDBDB]"
              />
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLoadProduct}
              disabled={!urlInput.trim() || isLoading}
              className="px-6 py-2.5 bg-[#ffe788] rounded-xl font-medium disabled:opacity-50"
            >
              {isLoading ? "불러오는 중..." : "불러오기"}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {isLoading && (
        <div className="text-center py-12 space-y-4">
          <img src={imgSpinner} alt="loading" className="mx-auto w-20" />
          <p className="text-[#505050]">상품을 불러오고 있어요...</p>
        </div>
      )}

      {products.length > 0 && (
        <motion.div className="w-full max-w-2xl space-y-6 mt-4">
          {products.map((p, i) => (
            <motion.div
              key={i}
              className="relative bg-white rounded-2xl shadow-md border p-5 space-y-4"
            >
              <div className="flex gap-4 items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(i)}
                  disabled={p.isSoldOut}
                  onChange={() => handleToggleSelect(i)}
                  className="w-5 h-5 accent-[#ffcc4c] disabled:opacity-40"
                />

                <div className="relative">
                  <img
                    src={p.imageUrls[0]}
                    alt={p.productName}
                    className={`w-20 h-20 rounded-lg object-cover ${
                      p.isSoldOut ? "grayscale opacity-60" : ""
                    }`}
                  />
                  {p.isSoldOut && (
                    <span className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm bg-black/40 rounded-lg">
                      품절
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="font-medium">{p.productName}</p>
                  <p className="text-sm text-[#555] mt-1 line-clamp-2">
                    {p.productDescription}
                  </p>
                  <p className="font-semibold mt-1">
                    {p.priceKRW.toLocaleString()}원
                  </p>
                  <p className="text-sm text-[#767676] mt-1">
                    수량: {p.quantity}개
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(i)}
                  className="absolute top-3 right-3 text-[#999] hover:text-red-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          ))}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111] font-semibold shadow-md"
          >
            장바구니에 담고 견적 확인하기
          </motion.button>
        </motion.div>
      )}
    </main>
  );
}
