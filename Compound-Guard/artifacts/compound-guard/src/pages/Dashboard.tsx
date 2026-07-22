import { useState } from "react";
import { DashboardStatBar } from "@/components/DashboardStatBar";
import { Heatmap } from "@/components/Heatmap";
import { AlertFeed } from "@/components/AlertFeed";
import { ZoneDetail } from "@/components/ZoneDetail";
import { EmergencyModal } from "@/components/EmergencyModal";

export default function Dashboard() {
  const [selectedZone, setSelectedZone] = useState<number | null>(null);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative bg-[#0B0F14]">
      <div className="p-4 border-b border-white/10">
        <DashboardStatBar />
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 p-4 flex flex-col min-w-0">
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#64748B] mb-3">Live Plant Overview</h2>
          <div className="flex-1 relative">
            <Heatmap onZoneClick={setSelectedZone} />
          </div>
        </div>
        
        <AlertFeed />
      </div>

      <ZoneDetail zoneId={selectedZone} onClose={() => setSelectedZone(null)} />
      <EmergencyModal />
    </div>
  );
}
