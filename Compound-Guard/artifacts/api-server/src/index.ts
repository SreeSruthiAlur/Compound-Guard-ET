import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { initDb, seedZones, seedPermits, seedShiftEvents, seedHistoricalReadings } from "./db/index.js";
import { startGenerator } from "./engine/generator.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Initialise database
try {
  initDb();
  seedZones();
  seedPermits();
  seedShiftEvents();
  seedHistoricalReadings();
  logger.info("Database initialised and seeded");
} catch (err) {
  logger.error({ err }, "Failed to initialise database");
  process.exit(1);
}

// Create HTTP server + Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  path: "/api/socket.io",
  cors: { origin: "*", methods: ["GET", "POST"] },
  transports: ["websocket", "polling"],
});

io.on("connection", (socket) => {
  logger.info({ socketId: socket.id }, "Socket.IO client connected");
  socket.on("disconnect", () => {
    logger.info({ socketId: socket.id }, "Socket.IO client disconnected");
  });
});

// Start data generator
startGenerator(io);
logger.info("Synthetic data generator started");

httpServer.listen(port, () => {
  logger.info({ port }, "Server listening");
});
