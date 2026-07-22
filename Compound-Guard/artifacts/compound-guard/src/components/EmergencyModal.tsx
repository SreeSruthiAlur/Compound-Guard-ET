import { useGetEmergencyResponse, useDismissAlert } from "@workspace/api-client-react";
import { AlertTriangle, Send, X, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Alert } from "@workspace/api-client-react";

export function EmergencyModal() {
  const [criticalAlertId, setCriticalAlertId] = useState<number | null>(null);
  
  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socket.on("new_alert", (data: { alert: Alert }) => {
      if (data.alert.severity === "critical" && data.alert.model_source === "compound") {
        setCriticalAlertId(data.alert.id);
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  const { data: response, isLoading } = useGetEmergencyResponse(criticalAlertId!, { query: { enabled: !!criticalAlertId } as any });
  const dismissMutation = useDismissAlert();

  if (!criticalAlertId) return null;

  const handleDismiss = () => {
    dismissMutation.mutate({ alertId: criticalAlertId }, {
      onSuccess: () => setCriticalAlertId(null)
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151B23] border-2 border-[#EF4444] rounded-lg max-w-2xl w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-[#EF4444] p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-white animate-pulse" />
          <div>
            <h2 className="font-serif text-xl font-bold text-white uppercase tracking-wider">
              ⚠ CRITICAL COMPOUND RISK ALERT — DRAFT RESPONSE
            </h2>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-[#64748B] font-mono animate-pulse">Generating response draft...</div>
        ) : response ? (
          <div className="p-6 overflow-y-auto space-y-6 relative animate-in fade-in duration-300">
            <div className="absolute top-6 right-6 px-3 py-1 rounded bg-[#F59E0B]/20 border border-[#F59E0B]/30 text-[#F59E0B] text-xs font-bold uppercase tracking-widest transform rotate-12 opacity-80 select-none">
              DRAFT — AWAITING HUMAN SIGN-OFF
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/30 p-3 rounded border border-white/5">
                  <div className="text-[10px] uppercase text-[#64748B] mb-1 font-mono">Zone Affected</div>
                  <div className="font-bold text-[#E2E8F0]">{response.zone_name}</div>
                </div>
                <div className="bg-black/30 p-3 rounded border border-white/5">
                  <div className="text-[10px] uppercase text-[#64748B] mb-1 font-mono">Generated At</div>
                  <div className="font-mono text-sm text-[#E2E8F0]">{new Date(response.generated_at).toLocaleString()}</div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#EF4444] mb-2 border-b border-white/10 pb-1">Draft Evacuation Notice</h3>
                <div className="bg-white/5 p-4 rounded font-mono text-sm text-[#E2E8F0] whitespace-pre-wrap leading-relaxed border border-white/10">
                  {response.evacuation_notice}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#F97316] mb-2 border-b border-white/10 pb-1">Preliminary Incident Report</h3>
                <div className="bg-white/5 p-4 rounded font-mono text-sm text-[#E2E8F0] whitespace-pre-wrap leading-relaxed border border-white/10">
                  {response.incident_report}
                </div>
              </div>

              {(response as any).citation && (
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#3B82F6] mb-2 border-b border-white/10 pb-1">Regulatory Context / RAG Citation</h3>
                  <div className="bg-[#3B82F6]/5 p-4 rounded font-sans text-sm text-[#E2E8F0] border border-[#3B82F6]/20">
                    <div className="font-bold text-[#3B82F6] mb-1 flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4" /> {(response as any).citation.title}
                    </div>
                    <div className="text-[10px] text-[#64748B] uppercase tracking-wider font-semibold mb-2">Source: {(response as any).citation.source_type}</div>
                    <div className="italic text-xs opacity-90 border-l-2 border-[#3B82F6]/30 pl-3 py-1 bg-black/10">
                      "{(response as any).citation.excerpt_text}"
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null}

        <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
          <button 
            onClick={handleDismiss}
            className="flex items-center gap-2 px-4 py-2 rounded font-semibold text-[#64748B] hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" /> Dismiss Draft
          </button>

          <button 
            disabled
            title="Requires authorized sign-off"
            className="flex items-center gap-2 px-6 py-2 rounded font-bold bg-[#EF4444] text-white opacity-50 cursor-not-allowed"
          >
            <Send className="w-4 h-4" /> Send Draft
          </button>
        </div>
      </div>
    </div>
  );
}
