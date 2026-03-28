import Fastify from "fastify";
import cors from "@fastify/cors";
import sensible from "@fastify/sensible";
import dotenv from "dotenv";
import { connectRedis } from "./cache/client";
import { db } from "./db/client";
import authPlugin from "./plugins/auth";
import rateLimitPlugin from "./plugins/rate-limit";
import { authRoutes } from "./routes/auth";
import { widgetRoutes } from "./routes/widgets";
import { eventRoutes } from "./routes/events";
import { initSocketServer } from "./socket/presence";

dotenv.config();

const fastify = Fastify({ logger: false });

async function bootstrap() {
  await fastify.register(cors, {
    origin: "http://localhost:3000",
    credentials: true,
  });
  await fastify.register(sensible);
  await fastify.register(authPlugin);
  await fastify.register(rateLimitPlugin);

  await fastify.register(authRoutes, { prefix: "/api/v1" });
  await fastify.register(widgetRoutes, { prefix: "/api/v1" });
  await fastify.register(eventRoutes, { prefix: "/api/v1" });

  fastify.get("/health", async () => ({ status: "ok" }));

  await connectRedis();

  try {
    await db.query("SELECT 1");
    console.log("Postgres connected");
  } catch (err) {
    console.error("Postgres failed:", err);
  }

  await fastify.listen({ port: 4000, host: "0.0.0.0" });
  console.log("Server ready at http://localhost:4000");

  initSocketServer(fastify.server as any, "http://localhost:3000");
  console.log("WebSocket ready");
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});