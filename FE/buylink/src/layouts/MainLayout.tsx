// src/layouts/MainLayout.tsx
import { Outlet, useNavigate } from "react-router-dom";
import { Package } from "lucide-react";
import type { ReactNode } from "react";

export default function MainLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fafaf9] via-white to-[#fef9e7]">
      {/* ✅ 공통 Header */}
        <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between">
            <div
            className="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate("/")}
            >
            <h1 className="text-base font-semibold text-[#111111]">바이링</h1> {/* 글씨 ↓ */}
            </div>
        </div>
        </header>

      {/* ✅ 페이지 내용 (라우터 children이 여기 렌더링됨) */}
      <main>
        <Outlet />
      </main>
    </div>
  );
}
