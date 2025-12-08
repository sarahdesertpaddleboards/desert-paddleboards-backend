import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**
 * Check if a port is free
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

/**
 * Find the first available port starting at startPort
 */
async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  /**
   * STRIPE WEBHOOK (must come BEFORE express.json)
   */
  const { handleStripeWebhook } = await import("../stripe-webhook");
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  /**
   * Normal request body parsing
   */
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  /**
   * OAuth routes
   */
  registerOAuthRoutes(app);

  /**
   * tRPC bridge for old URL style:
   *   /api/trpc/system.health?input={"timestamp":123}
   */
  app.use("/api/trpc", (req, res) => {
    // 1) Compute procedure path: "/system.health" -> "system.health"
    const procedurePath = req.path.startsWith("/")
      ? req.path.slice(1)
      : req.path;

    // 2) Extract input
    let input: unknown = undefined;

    // GET ?input=...
    if (req.method === "GET" && typeof req.query.input === "string") {
      try {
        input = JSON.parse(req.query.input);
      } catch (err) {
        console.error("Failed to parse GET input:", err);
      }
    }

    // POST body.input
    if (req.method !== "GET" && req.body?.input !== undefined) {
      input = req.body.input;
    }

    // 3) tRPC v11 expects input in body
    req.body = { input };

    // 4) Hand off to tRPC
    return nodeHTTPRequestHandler({
      req,
      res,
      router: appRouter,
      createContext,
      path: procedurePath, // <-- no leading slash
    });
  });

  /**
   * Start server
   */
  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
