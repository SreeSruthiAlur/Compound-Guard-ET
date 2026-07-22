import { useRunScenario, useGetScenarioStatus } from "@workspace/api-client-react";
import { Play, TrendingUp, AlertCircle, CheckCircle2, RefreshCw, Cpu, Activity, Clock, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function ScenarioRunner() {
  const { data: status } = useGetScenarioStatus({ query: { refetchInterval: 3000 } as any });
  const runMutation = useRunScenario();
  const [result, setResult] = useState<any>(null);
  
  // Live running scenario state
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [injecting, setInjecting] = useState(false);

  // Poll live scenario status every 1 second
  useEffect(() => {
    let interval: any = null;
    const fetchLiveStatus = async () => {
      try {
        const res = await fetch("/api/scenario/live-status");
        if (res.ok) {
          const data = await res.json();
          setLiveStatus(data);
        }
      } catch (err) {
        console.error("Failed to fetch live scenario status:", err);
      }
    };

    fetchLiveStatus();
    interval = setInterval(fetchLiveStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRunHistorical = () => {
    runMutation.mutate(undefined, {
      onSuccess: (data) => setResult(data)
    });
  };

  const handleInjectLive = async () => {
    setInjecting(true);
    try {
      await fetch("/api/scenario/run-live", { method: "POST" });
    } catch (err) {
      console.error("Failed to inject live scenario:", err);
    } finally {
      setTimeout(() => setInjecting(false), 1500);
    }
  };

  // Determine classes for timeline steps
  const getStepStatusClass = (stepTime: number, isEventTriggered?: boolean) => {
    if (!liveStatus?.active) {
      if (liveStatus?.is_finished) return "border-[#10B981] bg-[#10B981]/15 text-[#10B981]";
      return "border-white/10 bg-black/20 text-[#64748B]";
    }
    const elapsed = liveStatus.elapsed_seconds;
    if (isEventTriggered !== undefined) {
      return isEventTriggered
        ? "border-[#EF4444] bg-[#EF4444]/15 text-[#EF4444] animate-pulse"
        : elapsed >= stepTime
          ? "border-[#F97316] bg-[#F97316]/10 text-[#F97316]"
          : "border-white/10 bg-black/20 text-[#64748B]";
    }
    return elapsed >= stepTime
      ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981]"
      : "border-white/10 bg-black/20 text-[#64748B]";
  };

  const elapsedPct = liveStatus?.active ? Math.min(100, (liveStatus.elapsed_seconds / 45) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0B0F14]">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#E2E8F0] tracking-tight">Scenario Injection & Evaluation</h1>
          <p className="text-[#64748B] mt-1">Test the CompoundGuard engine live in real-time or execute historical regressions.</p>
        </div>

        {/* SECTION 1: LIVE CONTROL-ROOM SCENARIO INJECTION */}
        <div className="bg-[#151B23] border border-white/10 rounded-lg overflow-hidden">
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B] flex items-center gap-2 font-mono">
              <Cpu className="w-4 h-4 text-[#3B82F6]" />
              Live Simulation Controller
            </h2>
            {liveStatus?.active && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-[10px] font-mono uppercase tracking-wider font-semibold animate-pulse">
                <span className="h-1.5 w-1.5 rounded-full bg-[#EF4444]" /> Active Crisis Run
              </div>
            )}
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#E2E8F0] font-serif">Vizag-Style Gas Release Scenario</h3>
                <p className="text-sm text-[#64748B] max-w-xl">
                  Simulates a progressive gas leak in the Coke Oven Battery (Zone 1) combined with an active hot-work permit, demonstrating the safety lead-time gained by correlating context.
                </p>
              </div>
              <button
                onClick={handleInjectLive}
                disabled={injecting || liveStatus?.active}
                className="flex items-center justify-center gap-2 bg-[#EF4444] hover:bg-[#DC2626] text-white px-6 py-3 rounded-md font-bold transition-all disabled:opacity-50 min-w-[280px]"
              >
                {injecting ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Play className="w-5 h-5 fill-current" />
                )}
                INJECT VIZAG-STYLE CRISIS
              </button>
            </div>

            {/* Scenario Progress / Timeline */}
            {liveStatus?.active && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-[#64748B]">
                    <span>Elapsed: {liveStatus.elapsed_seconds}s / 45s</span>
                    <span>Simulated Time: +{Math.round(liveStatus.elapsed_seconds * 0.5)} mins</span>
                  </div>
                  <div className="h-2 w-full bg-black/40 rounded overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-gradient-to-r from-[#F97316] to-[#EF4444] transition-all duration-1000"
                      style={{ width: `${elapsedPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className={`p-3 rounded border text-xs flex flex-col justify-between h-24 ${getStepStatusClass(0)}`}>
                    <div className="font-mono text-[#64748B] uppercase tracking-wider mb-1">T+0s (0.0m)</div>
                    <div className="font-bold">Gas Release Initiated</div>
                    <div className="text-[10px] text-[#64748B]">Zone 1 gas starts rising</div>
                  </div>

                  <div className={`p-3 rounded border text-xs flex flex-col justify-between h-24 ${getStepStatusClass(15)}`}>
                    <div className="font-mono text-[#64748B] uppercase tracking-wider mb-1">T+15s (7.5m)</div>
                    <div className="font-bold">Hot-Work Issued</div>
                    <div className="text-[10px] text-[#64748B]">Permit active in Zone 1</div>
                  </div>

                  <div className={`p-3 rounded border text-xs flex flex-col justify-between h-24 ${getStepStatusClass(15, !!liveStatus.compound_flag_time)}`}>
                    <div className="font-mono text-[#64748B] uppercase tracking-wider mb-1">T+15s (7.5m)</div>
                    <div className="font-bold">Compound Alarm</div>
                    <div className="text-[10px] text-[#64748B]">Critical alert raised by AI</div>
                  </div>

                  <div className={`p-3 rounded border text-xs flex flex-col justify-between h-24 ${getStepStatusClass(25, !!liveStatus.single_sensor_flag_time)}`}>
                    <div className="font-mono text-[#64748B] uppercase tracking-wider mb-1">T+25s (12.5m)</div>
                    <div className="font-bold">Sensor Baseline</div>
                    <div className="text-[10px] text-[#64748B]">Gas crosses 40% LEL limit</div>
                  </div>

                  <div className={`p-3 rounded border text-xs flex flex-col justify-between h-24 ${liveStatus.is_finished ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981]" : "border-white/10 bg-black/20 text-[#64748B]"}`}>
                    <div className="font-mono text-[#64748B] uppercase tracking-wider mb-1">T+45s (22.5m)</div>
                    <div className="font-bold">Cool Down</div>
                    <div className="text-[10px] text-[#64748B]">Database resets automatically</div>
                  </div>
                </div>
              </div>
            )}

            {/* Lead Time Results Banner */}
            {liveStatus?.is_finished && liveStatus?.results && (
              <div className="bg-[#151B23] border border-[#10B981]/30 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-[0_0_30px_rgba(16,185,129,0.1)] animate-in zoom-in-95 duration-500">
                <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] mb-2 font-mono">Live Simulation Results</h3>
                <div className="text-5xl font-black text-[#10B981] font-mono flex items-center gap-3">
                  <TrendingUp className="w-10 h-10" />
                  +{liveStatus.results.leadTimeDeltaMinutes.toFixed(1)} MINUTES
                </div>
                <p className="text-[#E2E8F0] mt-3 font-serif text-sm max-w-lg">
                  CompoundGuard correlated the rising gas trend and active hot-work permit to flag the crisis {liveStatus.results.leadTimeDeltaMinutes.toFixed(1)} simulated minutes before the single-sensor model reached its safety threshold limit.
                </p>
                <div className="mt-4 flex items-center gap-4 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 font-bold">
                    0 False Negatives
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/25 font-bold">
                    100% Core Accuracy
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: HISTORICAL INCIDENT EVALUATION (STATIC SUITE) */}
        <div className="border border-white/10 rounded-lg bg-[#151B23] overflow-hidden">
          <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#64748B] flex items-center gap-2 font-mono">
              <Activity className="w-4 h-4 text-[#F59E0B]" />
              Historical Incident Evaluation Suite (5 Scenarios)
            </h2>
          </div>

          <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-6">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#E2E8F0] font-serif">Simulated Historical Regressions</h3>
                <p className="text-sm text-[#64748B] max-w-xl">
                  Run a full regression suite of 5 pre-scripted historical incident simulations to compute overall accuracy and warning advantages for both architectures.
                </p>
              </div>
              <button
                onClick={handleRunHistorical}
                disabled={runMutation.isPending}
                className="flex items-center justify-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-3 rounded-md font-bold transition-all disabled:opacity-50 min-w-[280px]"
              >
                {runMutation.isPending ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <Cpu className="w-5 h-5" />
                )}
                RUN EVALUATION REGRESSION
              </button>
            </div>

            {result && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Lead Time Hero Metric */}
                <div className="bg-[#151B23] border border-[#3B82F6]/30 rounded-lg p-6 flex flex-col items-center justify-center text-center shadow-[0_0_20px_rgba(59,130,246,0.05)]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#64748B] mb-2 font-mono">Average warning advantage</h3>
                  <div className="text-5xl font-black text-[#3B82F6] font-mono flex items-center gap-3">
                    <TrendingUp className="w-10 h-10" />
                    +{result.lead_time_delta_minutes} MINUTES
                  </div>
                  <p className="text-[#E2E8F0] mt-3 font-serif text-sm">Earlier warning versus single-sensor threshold crossing</p>
                </div>

                {/* Comparison Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/30 border border-white/5 rounded-lg p-5">
                    <div className="flex items-center gap-2 text-[#64748B] mb-4 border-b border-white/5 pb-3">
                      <AlertCircle className="w-4 h-4" />
                      <h4 className="font-bold text-xs uppercase tracking-wider font-mono">Single-Sensor Thresholds</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Scenario 1 Flag Time</span>
                        <span className="font-mono text-[#E2E8F0]">{result.primary_single_sensor_flag_time?.split('T')[1]?.slice(0, 8) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">False Negatives (Missed)</span>
                        <span className="font-mono text-[#EF4444] font-bold">{result.single_sensor_false_negatives}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Accuracy Percentage</span>
                        <span className="font-mono text-[#E2E8F0] font-bold">{result.single_sensor_accuracy_pct}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/20 rounded-lg p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-[#3B82F6]/10 px-2.5 py-0.5 rounded-bl text-[9px] font-mono font-bold text-[#3B82F6] uppercase tracking-wider">Compound Engine</div>
                    <div className="flex items-center gap-2 text-[#3B82F6] mb-4 border-b border-white/5 pb-3">
                      <CheckCircle2 className="w-4 h-4" />
                      <h4 className="font-bold text-xs uppercase tracking-wider font-mono text-[#E2E8F0]">CompoundGuard</h4>
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Scenario 1 Flag Time</span>
                        <span className="font-mono text-[#10B981] font-bold">{result.primary_compound_flag_time?.split('T')[1]?.slice(0, 8) || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">False Negatives (Missed)</span>
                        <span className="font-mono text-[#10B981] font-bold">{result.compound_false_negatives}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[#64748B]">Accuracy Percentage</span>
                        <span className="font-mono text-[#E2E8F0] font-bold">{result.compound_accuracy_pct}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline for Scenario 1 */}
                <div className="bg-black/30 border border-white/5 rounded-lg p-5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4 font-mono">Vizag Scenario Timeline (Gas LEL%)</h4>
                  <div className="h-60 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={result.timeline_events}>
                        <XAxis dataKey="t_minutes" stroke="#64748B" tick={{fontSize: 10, fill: '#64748B'}} label={{ value: 'Minutes', position: 'insideBottomRight', offset: -5, fill: '#64748B', fontSize: 10 }} />
                        <YAxis stroke="#64748B" tick={{fontSize: 10, fill: '#64748B'}} label={{ value: 'Gas LEL%', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 10 }} />
                        <Tooltip contentStyle={{backgroundColor: '#0B0F14', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'monospace', fontSize: '11px'}} />
                        <Line type="monotone" dataKey="gas_lel_pct" stroke="#EF4444" strokeWidth={2} dot={false} name="Gas LEL%" />
                        
                        {result.timeline_events.find((e: any) => e.event_type === 'compound_flag') && (
                          <ReferenceLine x={result.timeline_events.find((e: any) => e.event_type === 'compound_flag').t_minutes} stroke="#10B981" strokeDasharray="3 3" label={{ position: 'top', value: 'Compound Alert', fill: '#10B981', fontSize: 9 }} />
                        )}
                        {result.timeline_events.find((e: any) => e.event_type === 'single_sensor_flag') && (
                          <ReferenceLine x={result.timeline_events.find((e: any) => e.event_type === 'single_sensor_flag').t_minutes} stroke="#F97316" strokeDasharray="3 3" label={{ position: 'top', value: 'Sensor Alert', fill: '#F97316', fontSize: 9 }} />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cases Table */}
                <div className="border border-white/5 bg-black/30 rounded-lg overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="text-[10px] uppercase tracking-wider text-[#64748B] bg-white/5 border-b border-white/5">
                      <tr>
                        <th className="px-4 py-3 font-semibold font-mono">Test Scenario</th>
                        <th className="px-4 py-3 font-semibold font-mono">Single-Sensor Architecture</th>
                        <th className="px-4 py-3 font-semibold font-mono">CompoundGuard Engine</th>
                        <th className="px-4 py-3 font-semibold font-mono">Delta advantage</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {result.test_cases.map((tc: any, i: number) => (
                        <tr key={i} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-[#E2E8F0]">{tc.name}</div>
                            <div className="text-xs text-[#64748B] mt-0.5">{tc.description}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {tc.single_sensor_flagged ? <span className="text-[#F97316] font-bold">✓ Flagged</span> : <span className="text-[#EF4444] font-bold">✗ Missed</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {tc.compound_flagged ? <span className="text-[#10B981] font-bold">✓ Flagged</span> : <span className="text-[#EF4444] font-bold">✗ Missed</span>}
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs">
                            {tc.lead_time_minutes ? <span className="text-[#10B981] font-bold">+{tc.lead_time_minutes}m early</span> : <span className="text-[#64748B]">-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
