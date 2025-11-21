// src/pages/RequestPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LinkIcon, X } from "lucide-react";
import imgSpinner from "../assets/spinner.gif";

// --------------------------------------------------------
// 타입 정의
// --------------------------------------------------------
export type Product = {
  productURL: string;
  productName: string;
  productDescription: string;
  priceKRW: number;
  hasShippingFee: boolean;
  category: string;
  imageUrls: string[];
  isSoldOut: boolean;
  quantity: number; // 프론트 전용
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export default function RequestPage() {
  const navigate = useNavigate();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --------------------------------------------------------
  // 🔗 실제 백엔드 /api/products/fetch, /api/products/predict
  // --------------------------------------------------------

 type ServerProduct = Omit<Product, "quantity">;

// 1) 상품 정보 크롤링: POST /api/products/fetch
const fetchProductFromServer = async (
  url: string
): Promise<ApiResponse<ServerProduct>> => {
  // DEV일 때만 백엔드 IP 사용, PROD(배포)에서는 빈 문자열
  const base = import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

  const finalUrl = `${base}/api/products/fetch`;
  console.log("[fetchProductFromServer] DEV:", import.meta.env.DEV);
  console.log("[fetchProductFromServer] Final URL:", finalUrl);

  const res = await fetch(finalUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error("상품 정보를 불러오는데 실패했습니다.");
  }

  return (await res.json()) as ApiResponse<ServerProduct>;
};

  // --------------------------------------------------------
  // URL 입력 후 “불러오기”
  // --------------------------------------------------------
  const handleLoadProduct = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);

    try {
      const url = urlInput.trim();

      // 같은 URL이 이미 있으면 두 번째부터 품절 처리
      const sameCount = products.filter((p) => p.productURL === url).length;
      const computedSoldOut = sameCount >= 1;

      // 🔥 1) 상품 크롤링 API 호출
      const fetchResult = await fetchProductFromServer(url);

      if (!fetchResult.success || !fetchResult.data) {
        alert(fetchResult.error ?? "유효하지 않은 URL입니다.");
        setIsLoading(false);
        return;
      }

      // 🔄 백엔드 product + 프론트 전용 quantity 추가
      const apiData: ApiResponse<Product> = {
        success: true,
        data: {
          ...fetchResult.data,
          isSoldOut: fetchResult.data.isSoldOut ?? computedSoldOut ?? false,
          quantity: 1,
        },
        error: null,
      };

      if (!apiData.success || !apiData.data) {
        alert(apiData.error ?? "유효하지 않은 URL입니다.");
        setIsLoading(false);
        return;
      }

      setProducts((prev) => [...prev, apiData.data!]);
      setUrlInput("");
    } catch (e) {
      console.error(e);
      alert("상품을 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // --------------------------------------------------------
  // 삭제 / 선택 토글
  // --------------------------------------------------------
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

  // --------------------------------------------------------
  // 장바구니 담기 (localStorage 버전)
  // --------------------------------------------------------
  const handleAddToCart = async () => {
    const selectedProducts = products.filter(
      (p, i) => selectedIds.has(i) && !p.isSoldOut
    );

    if (selectedProducts.length === 0) {
      alert("장바구니에 담을 상품을 선택하세요!");
      return;
    }

    localStorage.setItem("cartProducts", JSON.stringify(selectedProducts));
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