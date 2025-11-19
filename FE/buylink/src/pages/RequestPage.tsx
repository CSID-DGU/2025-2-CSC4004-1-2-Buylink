// src/pages/RequestPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { LinkIcon, X } from "lucide-react";
import imgSpinner from "../assets/spinner.gif";

// --------------------------------------------------------
// 타입 정의 (이 파일에서 직접 관리)
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

// /api/products/predict 응답 타입
type PredictResponse = {
  weight: number; // kg
  volume: number; // m3
};

export default function RequestPage() {
  const navigate = useNavigate();

  const [urlInput, setUrlInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // 🔸 상품 정보 리스트 (순수 로컬 상태)
  const [products, setProducts] = useState<Product[]>([]);

  // 🔸 체크된 상품 index
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // --------------------------------------------------------
  // 🔥 (현재 사용) 목업 데이터 – UI 확인용
  //    👉 나중에 백엔드 붙이면 이 함수는 삭제해도 된다.
  // --------------------------------------------------------
  const mockFetchProduct = (
    url: string,
    soldout: boolean
  ): ApiResponse<Product> => {
    return {
      success: true,
      data: {
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
      },
      error: null,
    };
  };

  // --------------------------------------------------------
  // 🔗 (나중에 사용) 실제 백엔드 /api/products/fetch, /api/products/predict
  //    👉 백엔드 준비되면 mockFetchProduct 지우고
  //       아래 함수들 주석 풀어서 사용하면 된다.
  // --------------------------------------------------------

  // 서버에서 오는 product에는 quantity 없음 → 별도 타입으로 받기
  /*
  type ServerProduct = Omit<Product, "quantity">;

  // 1) 상품 정보 크롤링: POST /api/products/fetch
  //    body: { "url": "https://jp.mercari.com/item/..." }
  //    resp: { success, data: ServerProduct, error }
  const fetchProductFromServer = async (
    url: string
  ): Promise<ApiResponse<ServerProduct>> => {
    const res = await fetch("/api/products/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }), // 명세: { "url": "..." }
    });

    if (!res.ok) {
      throw new Error("상품 정보를 불러오는데 실패했습니다.");
    }

    const json = (await res.json()) as ApiResponse<ServerProduct>;
    return json;
  };

  // 2) AI에 정보 전달: POST /api/products/predict
  //    body: fetchProductFromServer의 응답 전체
  //    resp: { "weight": 0.43, "volume": 0.0021 }
  const predictProductFromServer = async (
    fetchResult: ApiResponse<ServerProduct>
  ): Promise<PredictResponse> => {
    const res = await fetch("/api/products/predict", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fetchResult),
    });

    if (!res.ok) {
      throw new Error("AI 예측 요청에 실패했습니다.");
    }

    const json = (await res.json()) as PredictResponse;
    return json;
  };
  */

  // --------------------------------------------------------
  // URL 입력 후 [불러오기] 클릭
  // --------------------------------------------------------
  const handleLoadProduct = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);

    try {
      const url = urlInput.trim();

      // 같은 URL이 몇 번 추가되었는지 체크 (예: 두 번째면 품절 처리)
      const sameCount = products.filter((p) => p.productURL === url).length;
      const computedSoldOut = sameCount >= 1;

      // ✅ 지금은 목업 사용
      const apiData = mockFetchProduct(url, computedSoldOut);

      // 🔁 실제 백엔드와 연결하면 아래처럼 교체
      /*
      const fetchResult = await fetchProductFromServer(url);

      if (!fetchResult.success || !fetchResult.data) {
        alert(fetchResult.error ?? "유효하지 않은 URL입니다.");
        setIsLoading(false);
        return;
      }

      // (선택) AI 예측 호출
      // const predict = await predictProductFromServer(fetchResult);
      // console.log("예측 결과:", predict.weight, predict.volume);

      const apiData: ApiResponse<Product> = {
        success: true,
        data: {
          ...fetchResult.data,
          // fetch 결과 isSoldOut이 있으면 우선 사용, 없으면 computedSoldOut 사용
          isSoldOut:
            fetchResult.data.isSoldOut ?? computedSoldOut ?? false,
          quantity: 1, // 프론트에서 기본 수량 1로 세팅
        },
        error: null,
      };
      */

      // 🚨 success:false → alert 출력 후 중단
      if (!apiData.success || !apiData.data) {
        alert(apiData.error ?? "유효하지 않은 URL입니다.");
        setIsLoading(false);
        return;
      }

      const product = apiData.data;

      // 🔥 success:true 일 때만 products에 push
      setProducts((prev) => [...prev, product]);
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

  // --------------------------------------------------------
  // 장바구니에 담고 견적 확인하기
  //  - 지금: localStorage로 CartPage와 연동
  //  - 나중에: /api/cart (명세 그대로) 사용
  // --------------------------------------------------------
  const handleAddToCart = async () => {
    // 선택 + 품절 아닌 상품만
    const selectedProducts = products.filter(
      (p, i) => selectedIds.has(i) && !p.isSoldOut
    );

    if (selectedProducts.length === 0) {
      alert("장바구니에 담을 상품을 선택하세요!");
      return;
    }

    // ✅ 현재 버전: 백엔드 없이 localStorage에만 저장
    localStorage.setItem("cartProducts", JSON.stringify(selectedProducts));
    navigate("/cart");

    // 🔁 나중에 백엔드 /api/cart 연동 버전
    //    ✨ 명세 기준: "요청은 단일 상품 객체", "응답은 items 배열"
    /*
    try {
      await Promise.all(
        selectedProducts.map(async (p) => {
          const payload = {
            url: p.productURL,
            productName: p.productName,
            productDescription: p.productDescription,
            priceKRW: p.priceKRW,
            hasShippingFee: p.hasShippingFee,
            category: p.category,
            imageUrl: p.imageUrls[0], // 대표 이미지
            imageUrls: p.imageUrls,
            isSoldOut: p.isSoldOut,
          };

          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload), // 🔥 단일 상품 객체
          });

          if (!res.ok) {
            throw new Error("장바구니 담기 실패");
          }

          // 응답 예시:
          // {
          //   "items": [...],
          //   "totalKRW": 19990
          // }
          const json = await res.json();
          console.log("현재 서버 장바구니 상태:", json);
        })
      );

      navigate("/cart");
    } catch (e) {
      console.error(e);
      alert("장바구니에 담는 중 문제가 발생했습니다.");
    }
    */
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
