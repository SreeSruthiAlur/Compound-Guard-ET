import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export function useSimulationClock() {
  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    let baseReal = Date.now();
    let baseSim = Date.now();

    // Fetch initial time from generator status
    const syncTime = async () => {
      try {
        const res = await fetch("/api/generator/status");
        if (res.ok) {
          const data = await res.json();
          if (data.current_simulated_time) {
            baseSim = new Date(data.current_simulated_time).getTime();
            baseReal = Date.now();
            setTime(new Date(baseSim));
          }
        }
      } catch (e) {
        console.error("Failed to sync simulation clock", e);
      }
    };

    syncTime();
    
    // Connect Socket.IO to receive live clock ticks
    const socket = io({ path: "/api/socket.io", transports: ["websocket", "polling"] });
    socket.on("clock_tick", (data: { current_simulated_time: string }) => {
      baseSim = new Date(data.current_simulated_time).getTime();
      baseReal = Date.now();
      setTime(new Date(baseSim));
    });

    // Run a local clock to tick smoothly between network updates (30x speedup)
    const tickInterval = setInterval(() => {
      const elapsedReal = Date.now() - baseReal;
      const elapsedSim = elapsedReal * 30; // 30x speedup
      setTime(new Date(baseSim + elapsedSim));
    }, 200);

    return () => {
      socket.disconnect();
      clearInterval(tickInterval);
    };
  }, []);

  return time;
}
