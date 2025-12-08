import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";

async function startServer() {
  const app = express();
  const server = createServer(app);

  const { handleStripeWebhook } = await import("../stripe-webhook");

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.use("/api/trpc/:path", (req, res) => {
    const procedure = req.params.path;

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

  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
