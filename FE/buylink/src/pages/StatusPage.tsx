import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle, XCircle, RefreshCw, Server, Database, Brain, Globe } from "lucide-react";

interface ServiceStatus {
  name: string;
  url: string;
  status: "checking" | "online" | "offline";
  responseTime?: number;
  icon: React.ElementType;
}

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: "Backend API", url: "/api/health", status: "checking", icon: Server },
    { name: "AI Service", url: "/api/ai/health", status: "checking", icon: Brain },
    { name: "Database", url: "/api/health", status: "checking", icon: Database },
  ]);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const checkHealth = async () => {
    setIsRefreshing(true);
    const updatedServices = await Promise.all(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          const response = await fetch(service.url, {
            method: "GET",
            signal: AbortSignal.timeout(5000)
          });
          const responseTime = Date.now() - startTime;
          return {
            ...service,
            status: response.ok ? "online" : "offline",
            responseTime,
          } as ServiceStatus;
        } catch {
          return { ...service, status: "offline", responseTime: undefined } as ServiceStatus;
        }
      })
    );
    setServices(updatedServices);
    setLastChecked(new Date());
    setIsRefreshing(false);
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "text-green-500";
      case "offline": return "text-red-500";
      default: return "text-yellow-500";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "online": return "bg-green-50 border-green-200";
      case "offline": return "bg-red-50 border-red-200";
      default: return "bg-yellow-50 border-yellow-200";
    }
  };

  const onlineCount = services.filter(s => s.status === "online").length;
  const allOnline = onlineCount === services.length;

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Globe className="w-10 h-10 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">시스템 상태</h1>
          </div>
          <p className="text-gray-600">Buylink 서비스 모니터링 대시보드</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`rounded-xl p-6 mb-8 border-2 ${allOnline ? "bg-green-50 border-green-200" : "bg-yellow-50 border-yellow-200"}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {allOnline ? (
                <CheckCircle className="w-12 h-12 text-green-500" />
              ) : (
                <XCircle className="w-12 h-12 text-yellow-500" />
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {allOnline ? "모든 시스템 정상" : `${onlineCount}/${services.length} 서비스 온라인`}
                </h2>
                <p className="text-gray-600">
                  마지막 확인: {lastChecked.toLocaleTimeString("ko-KR")}
                </p>
              </div>
            </div>
            <button
              onClick={checkHealth}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? "animate-spin" : ""}`} />
              새로고침
            </button>
          </div>
        </motion.div>

        <div className="space-y-4">
          {services.map((service, index) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`rounded-xl p-6 border-2 ${getStatusBg(service.status)}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <service.icon className={`w-8 h-8 ${getStatusColor(service.status)}`} />
                  <div>
                    <h3 className="font-semibold text-gray-900">{service.name}</h3>
                    <p className="text-sm text-gray-500">{service.url}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`flex items-center gap-2 ${getStatusColor(service.status)}`}>
                    {service.status === "online" ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : service.status === "offline" ? (
                      <XCircle className="w-5 h-5" />
                    ) : (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    )}
                    <span className="font-medium capitalize">
                      {service.status === "online" ? "정상" : service.status === "offline" ? "오프라인" : "확인중"}
                    </span>
                  </div>
                  {service.responseTime && (
                    <p className="text-sm text-gray-500">{service.responseTime}ms</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center text-sm text-gray-500"
        >
          자동 새로고침: 30초마다
        </motion.div>
      </div>
    </div>
  );
}
