import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

/**


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
  app.use("/api/trpc/:path", (req, res) => {
    const procedure = req.params.path; // "system.health"
  
    let input = undefined;
  
    if (req.method === "GET" && typeof req.query.input === "string") {
      try {
        input = JSON.parse(req.query.input);
      } catch (err) {
        console.error("Failed to parse GET input:", err);
      }
    }
  
    if (req.method !== "GET" && req.body?.input !== undefined) {
      input = req.body.input;
    }
  
    return nodeHTTPRequestHandler({
      req,
      res,
      router: appRouter,
      createContext,
      path: procedure,
      getInput: () => input,
    });
  });
  

  /**
   * Start server
   */
  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  
}

startServer().catch(console.error);
