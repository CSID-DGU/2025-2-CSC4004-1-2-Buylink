import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout"; // ✅ 레이아웃
import MainPage from "./pages/MainPage";
import RequestPage from "./pages/RequestPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderCompletePage from "./pages/OrderCompletePage";
import NotFoundPage from "./pages/NotFoundPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />, // ✅ 공통 헤더/푸터 들어가는 레이아웃
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <MainPage /> }, // ✅ 홈
      { path: "request", element: <RequestPage /> }, // 구매 요청
      { path: "cart", element: <CartPage /> }, // 장바구니
      { path: "checkout", element: <CheckoutPage /> }, // 결제
      { path: "order-complete", element: <OrderCompletePage /> }, // 주문 완료
    ],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
