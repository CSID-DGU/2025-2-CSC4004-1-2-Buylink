// src/pages/MainPage.tsx
import { motion, AnimatePresence } from "motion/react";
import { ShoppingCart, Package, ChevronLeft, CheckCircle, TrendingUp,
    Shield, Zap, Globe, Camera, DollarSign, Users, ArrowRight, AlertCircle,} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import sampleimg from "../assets/cuteeeee.png";

type PageType = "home" | "request" | "cart" | "checkout" | "order-complete";

export default function MainPage() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const navigate = useNavigate();

  const features = [
    {
      icon: Camera,
      title: "AI 이미지 무게/부피 계산",
      description:
        "AI 이미지 인식 기술로 상품의 무게와 부피를 자동 계산하여 정확한 배송비를 제공합니다.",
    },
    {
      icon: DollarSign,
      title: "투명한 비용 계산",
      description:
        "복잡한 해외 배송비도 한눈에! 모든 비용을 투명하게 확인할 수 있습니다.",
    },
    {
      icon: Shield,
      title: "안전한 결제 시스템",
      description: "다양한 결제 수단과 보험 가입으로 안심하고 이용하세요.",
    },
    {
      icon: Zap,
      title: "간편한 주문 프로세스",
      description: "링크 하나로 끝! 복잡한 절차 없이 빠르고 쉽게 주문하세요.",
    },
  ];

  return (
    <>
      {/* Main Content */}
      <AnimatePresence mode="wait">
        {currentPage === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Hero Section */}
            <section className="relative overflow-hidden py-16 lg:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                  <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="space-y-8"
                  >
                    <div className="space-y-4">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="inline-block"
                      >
                        <span className="px-4 py-2 bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] rounded-full text-sm font-[600] text-[#111111]">
                          해외 직구의 새로운 기준
                        </span>
                      </motion.div>
                      <h1 className="text-5xl lg:text-6xl text-[#111111] font-[700] leading-tight">
                        복잡한 해외 BUY
                        <br />
                        <span className="text-[#111111]">링크 하나로 끝!</span>
                        <br />
                        <span className="text-[#ffcc4c]">바이링</span>
                      </h1>
                      <p className="text-lg lg:text-xl text-[#505050] leading-relaxed">
                        AI 기반 무게/부피 자동 계산으로
                        <br />
                        투명하고 간편한 해외 구매 대행 서비스
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("request")}
                        className="px-37 py-4 bg-gradient-to-r from-[#ffe788] to-[#ffcc4c] rounded-xl text-[#111111] font-[600] shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        지금 주문하러가기
                        <ArrowRight className="w-5 h-5" />
                      </motion.button>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="relative"
                  >
                    <div className="relative bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-[#e5e5ec]/50">
                      <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br from-[#ffe788]/20 to-[#ffcc4c]/20 flex items-center justify-center">
                        <img
                          src={sampleimg}
                          alt="Shopping"
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    </div>
                    {/* Floating elements */}
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-xl p-4 border border-[#e5e5ec]"
                    >
                      <Package className="w-8 h-8 text-[#ffcc4c]" />
                    </motion.div>
                    <motion.div
                      animate={{ y: [0, 10, 0] }}
                      transition={{ duration: 4, repeat: Infinity }}
                      className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl p-4 border border-[#e5e5ec]"
                    >
                      <Globe className="w-8 h-8 text-[#ffcc4c]" />
                    </motion.div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Problem Section */}
            <section className="py-16 lg:py-24 bg-gradient-to-b from-transparent to-[#f7f7fb]/50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-16"
                >
                  <h2 className="text-3xl lg:text-5xl font-[700] text-[#ffcc4c] mb-6">
                    늘어나는 해외구매
                    <br />
                    <span className="text-[#111111]">여전히 불편한 경험만 한가득</span>
                  </h2>
                  <p className="text-lg text-[#505050]">
                    1,000명 중 55.9%가 불만 또는 매체 경험
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border border-[#e5e5ec]/50"
                  >
                    <div className="w-14 h-14 bg-[#ff4242]/10 rounded-xl flex items-center justify-center mb-6">
                      <DollarSign className="w-7 h-7 text-[#ff4242]" />
                    </div>
                    <h3 className="text-xl font-[600] text-[#111111] mb-4">
                      복잡한 절차
                    </h3>
                    <p className="text-[#505050] mb-4">
                      38.7%의 고객이 복잡한 배송비 계산과 결제 절차에 불편함을
                      느낍니다.
                    </p>
                    <div className="pt-4 border-t border-[#e5e5ec]">
                      <span className="text-2xl font-[700] text-[#ff4242]">
                        38.7%
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border border-[#e5e5ec]/50"
                  >
                    <div className="w-14 h-14 bg-[#ff9200]/10 rounded-xl flex items-center justify-center mb-6">
                      <AlertCircle className="w-7 h-7 text-[#ff9200]" />
                    </div>
                    <h3 className="text-xl font-[600] text-[#111111] mb-4">
                      불투명한 비용
                    </h3>
                    <p className="text-[#505050] mb-4">
                      11.7%의 고객이 숨겨진 비용과 불명확한 배송비에 불만을
                      가집니다.
                    </p>
                    <div className="pt-4 border-t border-[#e5e5ec]">
                      <span className="text-2xl font-[700] text-[#ff9200]">
                        11.7%
                      </span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all p-8 border border-[#e5e5ec]/50"
                  >
                    <div className="w-14 h-14 bg-[#767676]/10 rounded-xl flex items-center justify-center mb-6">
                      <Package className="w-7 h-7 text-[#767676]" />
                    </div>
                    <h3 className="text-xl font-[600] text-[#111111] mb-4">
                      기타 불만
                    </h3>
                    <p className="text-[#505050] mb-4">
                      배송 지연, 상품 파손, 고객 지원 부족 등 다양한
                      불편함이 있습니다.
                    </p>
                    <div className="pt-4 border-t border-[#e5e5ec]">
                      <span className="text-2xl font-[700] text-[#767676]">
                        기타
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            </section>

            {/* Solution Section */}
            <section className="py-16 lg:py-24">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="text-center mb-16"
                >
                  <h2 className="text-3xl lg:text-5xl font-[700] text-[#111111] mb-6">
                    복잡한 해외구매,
                    <br />
                    <span className="text-[#ffcc4c]">링크 하나로 끝!</span>
                  </h2>
                  <p className="text-lg text-[#505050]">
                    AI 이미지 무게/부피 계산으로 모든 불편함을 해결합니다
                  </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 mb-16">
                  {features.map((feature, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ y: -8 }}
                      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-2xl transition-all p-8 border border-[#e5e5ec]/50"
                    >
                      <div className="w-14 h-14 bg-gradient-to-br from-[#ffe788] to-[#ffcc4c] rounded-xl flex items-center justify-center mb-6">
                        <feature.icon className="w-7 h-7 text-[#111111]" />
                      </div>
                      <h3 className="text-lg font-[600] text-[#111111] mb-3">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-[#505050] leading-relaxed">
                        {feature.description}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Solution Detail Card */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="bg-gradient-to-br from-[#fff5c9] to-[#ffe788]/30 rounded-3xl shadow-xl p-8 lg:p-12 border border-[#ffe788]/50"
                >
                  <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    <div className="space-y-6">
                      <h3 className="text-2xl lg:text-3xl font-[700] text-[#111111]">
                        복잡한 절차 해결
                      </h3>
                      <div className="space-y-4">
                        {[
                          "한 번의 클릭으로 상품의 무게와 부피를 AI가 자동 측정",
                          "AI의 인식 기반 무게/부피 측정을 통해 건별 발송 비용 계산",
                          "간편한 통합 결제 시스템으로 복잡한 절차 최소화",
                        ].map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-[#ffcc4c] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <CheckCircle className="w-4 h-4 text-[#111111]" />
                            </div>
                            <p className="text-[#111111]">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-2xl lg:text-3xl font-[700] text-[#111111]">
                        불투명한 비용 해결
                      </h3>
                      <div className="space-y-4">
                        {[
                          "AI의 인식 기반 KG/부피 측정을 통해 건별 발송 비용 계산",
                          "상품별 발송 비용 계산 및 합치기 시 예상 비용 제공",
                          "모든 비용을 투명하게 공개하여 신뢰도 향상",
                        ].map((t, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-[#ffcc4c] rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <CheckCircle className="w-4 h-4 text-[#111111]" />
                            </div>
                            <p className="text-[#111111]">{t}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 lg:py-24">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-gradient-to-br from-[#ffe788] to-[#ffcc4c] rounded-3xl shadow-2xl p-12 lg:p-16 text-center"
                    >
                    <h2 className="text-3xl lg:text-4xl font-[700] text-[#111111] mb-6">
                        지금 바로 시작하세요!
                    </h2>
                    <p className="text-lg text-[#111111] mb-8 opacity-80">
                        복잡한 해외 구매, 바이링으로 쉽고 빠르게 해결하세요
                    </p>

                    {/* ✅ 클릭 시 RequestPage로 이동 */}
                    <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => navigate("/request")} // ✅ 수정 포인트
                        className="px-12 py-5 bg-[#111111] text-white rounded-xl font-[600] text-lg shadow-xl hover:shadow-2xl transition-all inline-flex items-center gap-3"
                    >
                        지금 주문하러가기
                        <ArrowRight className="w-6 h-6" />
                    </motion.button>
                    </motion.div>
                </div>
                </section>

            {/* Footer */}
            <footer className="py-12 bg-[#111111] text-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Package className="w-6 h-6 text-[#ffcc4c]" />
                      <h3 className="text-xl font-[700]">바이링</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      복잡한 해외 BUY
                      <br />
                      링크 하나로 끝!
                    </p>
                  </div>
                  <div>
                    <h4 className="font-[600] mb-4">공개 SW 프로젝트</h4>
                    <p className="text-sm text-gray-400">
                      2조: 강병민, 남윤수, 박지은, 최하영
                    </p>
                  </div>
                </div>
                <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400">
                  © 2025 바이링. All rights reserved.
                </div>
              </div>
            </footer>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
