import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import MainPage from "./pages/MainPage";
import RequestPage from "./pages/RequestPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderCompletePage from "./pages/OrderCompletePage";
import NotFoundPage from "./pages/NotFoundPage";
import PaymentsSuccessPage from "./pages/PaymentsSuccessPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { index: true, element: <MainPage /> },
      { path: "request", element: <RequestPage /> },
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "order-complete", element: <OrderCompletePage /> },
      { path: "orders", element: <OrderHistoryPage /> },
    ],
  },

  {
    path: "/payments/success",
    element: <PaymentsSuccessPage />,
  },

]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;