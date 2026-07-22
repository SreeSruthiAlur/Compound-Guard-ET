import { useGetAlerts, useDismissAlert, Alert } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ShieldAlert, Info, BookOpen, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { io } from "socket.io-client";

export default function AlertLog() {
  const { data: initialAlerts, refetch } = useGetAlerts(
    { limit: 100, include_dismissed: false },
    { query: { refetchInterval: 3000 } as any }
  );
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const dismissMutation = useDismissAlert();
  const { toast } = useToast();

  useEffect(() => {
    if (initialAlerts) {
      setAlerts(initialAlerts);
    }
  }, [initialAlerts]);

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    
    socket.on("new_alert", (data: { alert: Alert }) => {
      const newAlert = { ...data.alert, isNew: true } as any;
      setAlerts(prev => {
        if (prev.some(a => a.id === data.alert.id)) return prev;
        return [newAlert, ...prev].slice(0, 100);
      });
      setTimeout(() => {
        setAlerts(prev => prev.map(a => a.id === data.alert.id ? { ...a, isNew: false } : a));
      }, 2000);
    });

    socket.on("alerts_update", () => {
      refetch();
    });

    return () => { socket.disconnect(); };
  }, [refetch]);

  const handleDismiss = (alertId: number) => {
    dismissMutation.mutate({ alertId }, {
      onSuccess: (data) => {
        toast({
          title: "Alert Dismissed",
          description: `Sensitivity adjusted to ${data.new_sensitivity.toFixed(2)}`,
        });
        refetch();
      }
    });
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case "critical": return "bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/20";
      case "elevated": return "bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20";
      case "watch": return "bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20";
      default: return "bg-white/5 text-[#64748B] border border-white/10";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0B0F14]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#E2E8F0] flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-[#F59E0B]" />
            Alert Log
          </h1>
          <p className="text-[#64748B] mt-1">Comprehensive history of generated alerts and AI reasoning.</p>
        </div>

        <div className="bg-[#151B23] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-wider text-[#64748B] bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Severity</th>
                <th className="px-4 py-3 font-semibold">Model</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {alerts?.map((alert: any) => (
                <tr 
                  key={alert.id} 
                  className={`hover:bg-white/[0.02] group transition-all duration-300 ${
                    alert.isNew ? "animate-highlight-flash" : ""
                  }`}
                >
                  <td className="px-4 py-4 font-mono whitespace-nowrap text-[#64748B]">
                    {format(new Date(alert.timestamp), "MMM dd HH:mm:ss")}
                  </td>
                  <td className="px-4 py-4 font-medium text-[#E2E8F0] whitespace-nowrap">
                    {alert.zone_name}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${getSeverityBadge(alert.severity)}`}>
                      {alert.severity}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/20 text-[#E2E8F0] uppercase border border-white/5">
                      {alert.model_source.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 font-mono font-bold text-[#E2E8F0]">
                    {alert.score.toFixed(1)}
                  </td>
                  <td className="px-4 py-4 w-full max-w-md">
                    <div className="text-[#E2E8F0] mb-2">{alert.explanation_text}</div>
                    {alert.citation && (
                      <div className="p-2 rounded bg-black/30 border border-white/5 border-l-2 border-l-[#3B82F6] flex gap-2 items-start mt-2">
                        <BookOpen className="w-4 h-4 text-[#3B82F6] shrink-0 mt-0.5" />
                        <div>
                          <div className="text-xs font-bold text-[#3B82F6] mb-0.5">{alert.citation.title}</div>
                          <div className="text-[10px] text-[#64748B] italic">"{alert.citation.excerpt_text}"</div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      disabled={dismissMutation.isPending}
                      className="text-[#64748B] hover:text-[#EF4444] transition-colors p-1 opacity-0 group-hover:opacity-100 disabled:opacity-50"
                      title="Dismiss Alert"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {!alerts || alerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                    <div className="flex flex-col items-center justify-center">
                      <Info className="w-8 h-8 mb-2 opacity-50" />
                      <p>No alerts recorded.</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
