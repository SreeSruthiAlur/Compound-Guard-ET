import { useGetStats, useGetSensitivity } from "@workspace/api-client-react";

export function DashboardStatBar() {
  const { data: stats } = useGetStats({ query: { refetchInterval: 3000 } as any });
  const { data: sensitivity } = useGetSensitivity({ query: { refetchInterval: 10000 } as any });

  const metrics = [
    { label: "Active Permits", value: stats?.active_permits ?? 0, color: "text-[#E2E8F0]" },
    { label: "Zones at Risk", value: stats?.zones_at_risk ?? 0, color: (stats?.zones_at_risk ?? 0) > 0 ? "text-[#F97316]" : "text-[#10B981]" },
    { label: "Active Alerts", value: stats?.active_alerts ?? 0, color: (stats?.active_alerts ?? 0) > 0 ? "text-[#F59E0B]" : "text-[#10B981]" },
    { label: "Critical Alerts", value: stats?.critical_alerts ?? 0, color: (stats?.critical_alerts ?? 0) > 0 ? "text-[#EF4444]" : "text-[#10B981]" },
    { label: "Sensitivity", value: sensitivity?.sensitivity.toFixed(2) ?? "1.00", color: "text-[#3B82F6]", isMono: true },
  ];

  return (
    <div className="flex items-center gap-px bg-white/10 p-px rounded-md overflow-hidden shrink-0">
      {metrics.map((m, i) => (
        <div key={i} className="bg-[#151B23] px-4 py-2 flex flex-col min-w-[120px] flex-1">
          <span className="text-[10px] uppercase tracking-wider text-[#64748B] mb-1 font-semibold">{m.label}</span>
          <span className={`text-xl font-bold ${m.isMono ? "font-mono" : "font-sans"} ${m.color}`}>
            {m.value}
          </span>
        </div>
      ))}
    </div>
  );
}
