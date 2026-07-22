import { useGetAlerts, Alert } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { ShieldAlert, Info } from "lucide-react";
import { format } from "date-fns";

export function AlertFeed() {
  const { data: initialAlerts } = useGetAlerts({ limit: 20, include_dismissed: false }, { query: { refetchInterval: 3000 } as any });
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts]);

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socket.on("new_alert", (data: { alert: Alert }) => {
      setAlerts(prev => [data.alert, ...prev].slice(0, 20));
    });
    return () => { socket.disconnect(); };
  }, []);

  const getSeverityColor = (sev: string) => {
    switch (sev) {
      case "critical": return "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/20";
      case "elevated": return "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/20";
      case "watch": return "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/20";
      default: return "text-[#64748B] bg-white/5 border-white/10";
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#151B23] border-l border-white/10 w-80 shrink-0">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-serif font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-[#E2E8F0]">
          <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
          Live Alert Feed
        </h3>
        <span className="text-xs font-mono text-[#64748B]">{alerts.length} Active</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#64748B]">
            <Info className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">No active alerts</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div 
              key={alert.id} 
              className={`p-3 rounded-md border ${getSeverityColor(alert.severity)} animate-in slide-in-from-right fade-in duration-300`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">{alert.zone_name}</span>
                <span className="text-[10px] font-mono opacity-80">{format(new Date(alert.timestamp), "HH:mm:ss")}</span>
              </div>
              <p className="text-sm text-[#E2E8F0] mb-2">{alert.explanation_text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/20 uppercase">
                  {alert.model_source.replace("_", " ")}
                </span>
                <span className="text-xs font-mono font-bold">SCORE: {alert.score.toFixed(1)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
