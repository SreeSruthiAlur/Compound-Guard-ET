import { Link, useLocation } from "wouter";
import { useGetGeneratorStatus } from "@workspace/api-client-react";
import { Activity, ShieldAlert, FileText, PlaySquare, LayoutDashboard } from "lucide-react";
import { useSimulationClock } from "@/hooks/useSimulationClock";
import { format } from "date-fns";

export function Navbar() {
  const [location] = useLocation();
  const { data: generator } = useGetGeneratorStatus({ query: { refetchInterval: 5000 } as any });
  const simClock = useSimulationClock();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/scenario", label: "Scenario Runner", icon: PlaySquare },
    { href: "/alerts", label: "Alert Log", icon: ShieldAlert },
    { href: "/permits", label: "Permits", icon: FileText },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#0B0F14]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0B0F14]/80">
      <div className="flex h-14 items-center px-4 md:px-6">
        <div className="flex items-center gap-2 mr-6">
          <Activity className="h-5 w-5 text-[#3B82F6]" />
          <span className="font-serif font-bold text-[#E2E8F0] tracking-tight">COMPOUND_GUARD</span>
        </div>

        <nav className="flex items-center space-x-1 lg:space-x-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? "bg-[#151B23] text-[#3B82F6]"
                    : "text-[#64748B] hover:bg-[#151B23] hover:text-[#E2E8F0]"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-6">
          <div className="flex items-center gap-2 bg-[#151B23] border border-white/10 rounded px-3 py-1 font-mono text-xs text-[#E2E8F0]">
            <span className="text-[#64748B] uppercase tracking-wider font-semibold mr-1">SIM_CLOCK:</span>
            <span className="text-[#3B82F6] font-bold">{format(simClock, "MMM dd HH:mm:ss")}</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#64748B]">
            <span className="uppercase tracking-wider">Generator</span>
            <div className={`h-2 w-2 rounded-full ${generator?.running ? "bg-[#10B981]" : "bg-[#EF4444]"}`} />
          </div>
        </div>
      </div>
    </header>
  );
}
