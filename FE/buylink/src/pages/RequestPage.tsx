import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LinkIcon, X } from "lucide-react";
import imgSpinner from "../assets/spinner.gif";
import { normalizeSoldOutFlags } from "../utils/soldOutHelper";

const API_BASE_URL =
  import.meta.env.DEV ? import.meta.env.VITE_API_BASE_URL ?? "" : "";

const buildApiUrl = (path: string) => `${API_BASE_URL}${path}`;

export type Product = {
  productURL: string;
  productName: string;
  productDescription: string;
  priceKRW: number;
  hasShippingFee: boolean;
  category: string;
  imageUrls: string[];
  isSoldOut: boolean;
  quantity: number;
};

type ApiResponse<T> = {
  success: boolean;
  data: T | null;
  error: string | null;
};

export default function RequestPage() {
  const navigate = useNavigate();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false); // 상품 불러오기 로딩
  const [isNavigating, setIsNavigating] = useState(false); // Cart 이동 로딩

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  type ServerProduct = Omit<Product, "quantity">;

  // 상품 정보 크롤링 POST
  const fetchProductFromServer = async (
    url: string
  ): Promise<ApiResponse<ServerProduct>> => {
    const finalUrl = buildApiUrl("/api/products/fetch");

    try {
      const res = await fetch(finalUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        credentials: "include",
      });

      if (!res.ok) {
        let message = "상품 정보를 불러오는데 실패했습니다.";

        try {
          const errBody = await res.json();
          if (typeof errBody?.error === "string") message = errBody.error;
          else if (typeof errBody?.message === "string") message = errBody.message;
        } catch {}

        return { success: false, data: null, error: message };
      }

      const json = (await res.json()) as ApiResponse<ServerProduct>;
      return json;
    } catch {
      return {
        success: false,
        data: null,
        error: "상품 정보를 불러오는데 실패했습니다.",
      };
    }
  };

  // URL 입력 후 상품 불러오기
  const handleLoadProduct = async () => {
    if (!urlInput.trim()) return;

    setIsLoading(true);

    try {
      const result = await fetchProductFromServer(urlInput.trim());

      if (!result.success || !result.data) {
        alert(result.error ?? "상품 정보를 불러오는 중 오류가 발생했습니다.");
        return;
      }

      const newProduct: Product = {
        ...result.data,
        isSoldOut: result.data.isSoldOut ?? false,
        quantity: 1,
      };

      setProducts((prev) =>
        normalizeSoldOutFlags<Product>([...prev, newProduct])
      );

      setUrlInput("");
    } catch {
      alert("상품 정보를 불러오는 중 문제가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  // 상품 삭제
  const handleDelete = (index: number) => {
    const removed = products[index];

    setProducts((prev) => {
      const filtered = prev.filter((_, i) => i !== index);
      return normalizeSoldOutFlags<Product>(filtered);
    });

    if (removed) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(removed.productURL);
        return newSet;
      });
    }
  };

  const handleToggleSelect = (productURL: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.has(productURL) ? newSet.delete(productURL) : newSet.add(productURL);
      return newSet;
    });
  };

  // 장바구니 POST 후 CartPage 이동
  const handleAddToCart = async () => {
    const selectedProducts = products.filter(
      (p) => selectedIds.has(p.productURL) && !p.isSoldOut
    );

    if (selectedProducts.length === 0) {
      alert("장바구니에 담을 상품을 선택하세요!");
      return;
    }

    try {
      const finalUrl = buildApiUrl("/api/cart");

      for (const p of selectedProducts) {
        const payload = {
          url: p.productURL,
          productName: p.productName,
          productDescription: p.productDescription,
          priceKRW: p.priceKRW,
          hasShippingFee: p.hasShippingFee,
          category: p.category,
          imageUrl: p.imageUrls[0] ?? "",
          imageUrls: p.imageUrls,
          isSoldOut: p.isSoldOut,
        };

        const res = await fetch(finalUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          credentials: "include",
        });

        if (!res.ok) throw new Error("장바구니 담기 실패");
        await res.json();
      }

      // ⭐ 이동 로딩 활성화
      setIsNavigating(true);

      setTimeout(() => {
        navigate("/cart");
      }, 300);
    } catch (e) {
      alert("장바구니에 담는 중 문제가 발생했습니다.");
    }
  };

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

        {/* URL 입력 */}
        <div className="bg-white rounded-2xl shadow-lg border p-6 mb-8 text-left">
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

      {/* 첫 로딩 스피너 */}
      {isLoading && products.length === 0 && (
        <div className="w-full max-w-2xl flex flex-col items-center justify-center py-16 mt-40">
          <img src={imgSpinner} alt="loading" className="w-20" />
          <p className="mt-4 text-[#505050]">상품을 불러오고 있어요...</p>
        </div>
      )}

      {/* 상품 목록 */}
      {products.length > 0 && (
        <motion.div className="w-full max-w-2xl space-y-6 mt-4">
          {products.map((p, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="relative bg-white rounded-2xl shadow-md border p-5 space-y-4"
            >
              <div className="flex gap-4 items-center">
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.productURL)}
                  disabled={p.isSoldOut}
                  onChange={() => handleToggleSelect(p.productURL)}
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

          {/* 버튼 */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddToCart}
            className="w-full mt-6 py-4 rounded-xl bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] text-[#111] font-semibold shadow-md"
          >
            장바구니에 담고 견적 확인하기
          </motion.button>

          {/* 버튼 바로 아래 로딩 표시 */}
          {isNavigating && (
            <div className="flex flex-col items-center justify-center py-10">
              <img src={imgSpinner} alt="loading" className="w-16 h-16" />
              <p className="mt-4 text-[#505050] text-sm font-medium">
                장바구니로 이동 중입니다...
              </p>
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}
