import { useGetZones, ZoneWithRisk } from "@workspace/api-client-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

interface HeatmapProps {
  onZoneClick: (zoneId: number) => void;
}

// Unified layout configuration (coordinates, text labels, and corner risk score badges)
const ZONE_LAYOUTS: Record<number, { labelX: number; labelY: number; scoreX: number; scoreY: number; points: string }> = {
  1: { labelX: 160, labelY: 135, scoreX: 245, scoreY: 85, points: "50,50 270,50 270,200 50,200" }, // Coke Oven Battery
  2: { labelX: 430, labelY: 135, scoreX: 515, scoreY: 85, points: "320,50 540,50 540,200 320,200" }, // Blast Furnace
  3: { labelX: 680, labelY: 135, scoreX: 745, scoreY: 85, points: "590,50 770,50 770,200 590,200" }, // Blower House
  4: { labelX: 160, labelY: 345, scoreX: 245, scoreY: 295, points: "50,260 270,260 270,410 50,410" }, // Gas Cleaning Plant
  5: { labelX: 430, labelY: 345, scoreX: 515, scoreY: 295, points: "320,260 540,260 540,410 320,410" }, // Storage Yard
  6: { labelX: 680, labelY: 345, scoreX: 745, scoreY: 295, points: "590,260 770,260 770,410 590,410" }, // Control Room
  7: { labelX: 240, labelY: 525, scoreX: 405, scoreY: 505, points: "50,470 430,470 430,560 50,560" }, // Maintenance Bay
  8: { labelX: 715, labelY: 525, scoreX: 925, scoreY: 505, points: "480,470 950,470 950,560 480,560" }, // Loading Dock
};

export function Heatmap({ onZoneClick }: HeatmapProps) {
  // Fix the hook parameter so React Query refetch works correctly
  const { data: initialZones, refetch } = useGetZones({ query: { refetchInterval: 3000 } as any });
  const [zones, setZones] = useState<ZoneWithRisk[]>([]);

  useEffect(() => {
    if (initialZones) {
      setZones(initialZones);
    }
  }, [initialZones]);

  useEffect(() => {
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    
    socket.on("risk_update", (data: { zones: ZoneWithRisk[] }) => {
      setZones(data.zones);
    });

    // Also trigger refetch when backend requests updates
    socket.on("alerts_update", () => refetch());
    socket.on("permits_update", () => refetch());

    return () => {
      socket.disconnect();
    };
  }, [refetch]);

  const getColor = (level: string) => {
    switch (level) {
      case "safe": return "#10B981"; // emerald
      case "watch": return "#F59E0B"; // amber
      case "elevated": return "#F97316"; // orange
      case "critical": return "#EF4444"; // red
      default: return "#64748B";
    }
  };

  return (
    <div className="w-full h-full bg-[#151B23] border border-white/10 rounded-md relative overflow-hidden flex items-center justify-center p-4">
      <svg viewBox="0 0 1000 600" className="w-full h-full max-h-[70vh] drop-shadow-md">
        
        {/* Walkway paths connecting adjacent zones */}
        <g opacity={0.3}>
          {/* Coke Oven to Blast Furnace */}
          <line x1="270" y1="125" x2="320" y2="125" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Blast Furnace to Blower House */}
          <line x1="540" y1="125" x2="590" y2="125" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Coke Oven to Gas Cleaning Plant */}
          <line x1="160" y1="200" x2="160" y2="260" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Gas Cleaning Plant to Storage Yard */}
          <line x1="270" y1="335" x2="320" y2="335" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Storage Yard to Control Room */}
          <line x1="540" y1="335" x2="590" y2="335" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Blower House to Control Room */}
          <line x1="680" y1="200" x2="680" y2="260" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Gas Cleaning Plant to Maintenance Bay */}
          <line x1="160" y1="410" x2="160" y2="470" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Storage Yard to Loading Dock */}
          <line x1="430" y1="335" x2="480" y2="515" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
          {/* Maintenance Bay to Loading Dock */}
          <line x1="430" y1="515" x2="480" y2="515" stroke="#FFFFFF" strokeWidth="2.5" strokeDasharray="5 5" />
        </g>

        {zones.map((zone) => {
          const layout = ZONE_LAYOUTS[zone.id];
          if (!layout) return null;

          const score = zone.current_compound_score ?? 0;
          const color = getColor(zone.risk_level);
          const isPulsing = zone.risk_level === "elevated" || zone.risk_level === "critical";

          return (
            <g 
              key={zone.id} 
              onClick={() => onZoneClick(zone.id)}
              className="cursor-pointer group"
            >
              {/* Zone Boundary polygon */}
              <polygon
                points={layout.points}
                fill={color}
                fillOpacity={0.12}
                stroke={color}
                strokeWidth={2}
                style={{ transition: "fill 0.6s ease" }}
                className={`group-hover:fill-opacity-25 transition-all duration-500 ${
                  isPulsing ? "animate-pulse-outline" : ""
                }`}
              />

              {/* Label Background box */}
              <rect
                x={layout.labelX - 70}
                y={layout.labelY - 13}
                width={140}
                height={26}
                fill="#0B0F14"
                fillOpacity={0.9}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
                rx={4}
              />

              {/* Labeled Name text */}
              <text
                x={layout.labelX}
                y={layout.labelY + 4}
                textAnchor="middle"
                fill="#E2E8F0"
                fontSize={10}
                fontWeight={700}
                className="font-sans pointer-events-none uppercase tracking-wider"
              >
                {zone.name}
              </text>

              {/* Score pill in the corner */}
              <g transform={`translate(${layout.scoreX - 25}, ${layout.scoreY - 12})`}>
                <rect
                  width={34}
                  height={18}
                  fill="#0B0F14"
                  stroke={color}
                  strokeWidth={1}
                  rx={3}
                />
                <text
                  x={17}
                  y={13}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontWeight={700}
                  className="font-mono"
                >
                  {Math.round(score)}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
