import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { RecoilRoot } from "recoil"; // ✅ 추가
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RecoilRoot>   {/* ✅ 반드시 App을 감싸야 함 */}
      <App />
    </RecoilRoot>
  </React.StrictMode>
);
