import { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-[#0B0F14] text-[#E2E8F0]">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
