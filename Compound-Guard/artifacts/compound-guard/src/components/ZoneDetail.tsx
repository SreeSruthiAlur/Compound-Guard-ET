import { useGetZone, useGetZoneSensors, useGetZoneRisk, useGetZonePermits } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { Alert } from "@workspace/api-client-react";
import { X, ShieldAlert, BookOpen, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface ZoneDetailProps {
  zoneId: number | null;
  onClose: () => void;
}

export function ZoneDetail({ zoneId, onClose }: ZoneDetailProps) {
  const { data: zone } = useGetZone(zoneId!, { query: { enabled: !!zoneId } as any });
  const { data: sensors } = useGetZoneSensors(zoneId!, { limit: 60 }, { query: { enabled: !!zoneId, refetchInterval: 3000 } as any });
  const { data: risk } = useGetZoneRisk(zoneId!, { query: { enabled: !!zoneId, refetchInterval: 3000 } as any });
  const { data: permits, refetch: refetchPermits } = useGetZonePermits(zoneId!, { active_only: true }, { query: { enabled: !!zoneId, refetchInterval: 3000 } as any });

  useEffect(() => {
    if (!zoneId) return;
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socket.on("permits_update", () => {
      refetchPermits();
    });
    return () => { socket.disconnect(); };
  }, [zoneId, refetchPermits]);

  if (!zoneId) return null;

  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-[#0B0F14] border-l border-white/10 shadow-2xl transition-transform duration-300 z-40 flex flex-col ${zoneId ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#151B23]">
        <h2 className="font-serif font-bold text-lg text-[#E2E8F0]">{zone?.name || "Loading..."}</h2>
        <button onClick={onClose} className="text-[#64748B] hover:text-[#E2E8F0] transition-colors p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Risk Breakdown */}
        {risk && (
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Risk Breakdown</h3>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#E2E8F0]">Compound Score</span>
              <span className="text-sm font-mono font-bold text-[#F97316]">{risk.compound_score.toFixed(1)}</span>
            </div>
            <div className="h-4 flex rounded-sm overflow-hidden bg-white/5 border border-white/10">
              <div style={{ width: `${Math.max(0, risk.sensor_contribution * 100)}%` }} className="bg-[#EF4444] transition-all" title="Sensor Contribution" />
              <div style={{ width: `${Math.max(0, risk.permit_conflict_contribution * 100)}%` }} className="bg-[#F97316] transition-all" title="Permit Conflict" />
              <div style={{ width: `${Math.max(0, risk.shift_context_contribution * 100)}%` }} className="bg-[#F59E0B] transition-all" title="Shift Context" />
            </div>
            <div className="flex gap-4 text-[10px] uppercase font-mono text-[#64748B]">
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#EF4444]"/> Sensor</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#F97316]"/> Permit</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#F59E0B]"/> Shift</div>
            </div>
          </section>
        )}

        {/* Live Sensors Chart */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Live Telemetry</h3>
          <div className="h-48 w-full bg-[#151B23] rounded-md border border-white/5 p-2">
            {sensors && sensors.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={[...sensors].reverse()}>
                  <XAxis dataKey="timestamp" hide />
                  <YAxis domain={[0, 100]} hide />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0B0F14', borderColor: 'rgba(255,255,255,0.1)', fontSize: '12px', fontFamily: 'monospace' }}
                    labelFormatter={(l) => format(new Date(l), "HH:mm:ss")}
                  />
                  <Line type="monotone" dataKey="gas_lel_pct" stroke="#EF4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="co_ppm" stroke="#F97316" strokeWidth={2} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="temperature_c" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">Waiting for data...</div>
            )}
          </div>
          <div className="flex gap-4 text-[10px] uppercase font-mono text-[#64748B] justify-center">
            <div className="flex items-center gap-1"><div className="w-2 h-[2px] bg-[#EF4444]"/> GAS LEL%</div>
            <div className="flex items-center gap-1"><div className="w-2 h-[2px] bg-[#F97316]"/> CO PPM</div>
            <div className="flex items-center gap-1"><div className="w-2 h-[2px] bg-[#3B82F6]"/> TEMP °C</div>
          </div>
        </section>

        {/* Active Permits */}
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Active Permits</h3>
          {permits && permits.length > 0 ? (
            <div className="space-y-2">
              {permits.map(permit => (
                <div key={permit.id} className={`p-3 rounded-md border text-sm ${permit.has_conflict ? "bg-[#EF4444]/10 border-[#EF4444]/20" : "bg-[#151B23] border-white/10"}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#E2E8F0]">{permit.type.replace("_", " ").toUpperCase()}</span>
                    {permit.has_conflict && <AlertTriangle className="w-4 h-4 text-[#EF4444]" />}
                  </div>
                  <div className="text-xs text-[#64748B] font-mono">ID: {permit.id} • Issued by {permit.issued_by}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[#64748B] italic">No active permits in this zone.</div>
          )}
        </section>

        {/* Citations */}
        {zone?.active_alerts?.filter(a => a.citation).map(alert => (
          <section key={alert.id} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">Regulatory Context</h3>
            <div className="p-3 rounded-md border-l-2 border-l-[#3B82F6] bg-[#151B23] border-y border-r border-white/10 hover:shadow-[inset_2px_0_10px_rgba(59,130,246,0.1)] transition-shadow">
              <div className="flex items-center gap-2 mb-2 text-[#3B82F6]">
                <BookOpen className="w-4 h-4" />
                <span className="text-xs font-bold">{alert.citation?.title}</span>
              </div>
              <p className="text-sm text-[#E2E8F0] italic">"{alert.citation?.excerpt_text}"</p>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
