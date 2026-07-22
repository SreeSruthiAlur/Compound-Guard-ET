import { useGetPermits } from "@workspace/api-client-react";
import { format } from "date-fns";
import { FileText, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useEffect } from "react";
import { io } from "socket.io-client";

export default function PermitLog() {
  const { data: permits, refetch } = useGetPermits(
    { active_only: false },
    { query: { refetchInterval: 3000 } as any }
  );

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socket.on("permits_update", () => {
      refetch();
    });
    return () => { socket.disconnect(); };
  }, [refetch]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <CheckCircle2 className="w-4 h-4 text-[#10B981]" />;
      case "expired": return <Clock className="w-4 h-4 text-[#64748B]" />;
      case "cancelled": return <XCircle className="w-4 h-4 text-[#EF4444]" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-[#10B981]";
      case "expired": return "text-[#64748B]";
      case "cancelled": return "text-[#EF4444]";
      default: return "text-[#64748B]";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0B0F14]">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#E2E8F0] flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#3B82F6]" />
            Permit Log
          </h1>
          <p className="text-[#64748B] mt-1">Track work permits and contextual risk conflicts.</p>
        </div>

        <div className="bg-[#151B23] border border-white/10 rounded-lg overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase tracking-wider text-[#64748B] bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 font-semibold">ID</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Timeframe</th>
                <th className="px-4 py-3 font-semibold">Issued By</th>
                <th className="px-4 py-3 font-semibold text-center">Conflict</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {permits?.map((permit) => (
                <tr 
                  key={permit.id} 
                  className={`hover:bg-white/[0.02] transition-colors ${permit.has_conflict ? "bg-[#EF4444]/5" : ""}`}
                >
                  <td className="px-4 py-4 font-mono text-[#64748B]">
                    #{permit.id}
                  </td>
                  <td className="px-4 py-4 font-medium text-[#E2E8F0] whitespace-nowrap">
                    {permit.zone_name || `Zone ${permit.zone_id}`}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-[10px] font-mono px-2 py-1 rounded bg-black/20 text-[#E2E8F0] uppercase border border-white/5">
                      {permit.type.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`flex items-center gap-1.5 font-medium uppercase text-[10px] tracking-wider ${getStatusColor(permit.status)}`}>
                      {getStatusIcon(permit.status)}
                      {permit.status}
                    </div>
                  </td>
                  <td className="px-4 py-4 font-mono whitespace-nowrap text-[#64748B] text-xs">
                    <div>{format(new Date(permit.start_time), "MMM dd HH:mm")}</div>
                    <div className="opacity-50">to {format(new Date(permit.end_time), "MMM dd HH:mm")}</div>
                  </td>
                  <td className="px-4 py-4 text-[#E2E8F0]">
                    {permit.issued_by}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {permit.has_conflict ? (
                      <div className="inline-flex items-center justify-center bg-[#EF4444]/10 border border-[#EF4444]/20 rounded p-1" title="Conflict Detected">
                        <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                      </div>
                    ) : (
                      <span className="text-[#64748B]">-</span>
                    )}
                  </td>
                </tr>
              ))}
              {!permits || permits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[#64748B]">
                    <p>No permits found.</p>
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
