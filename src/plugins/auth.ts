import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export default fp(async (fastify: FastifyInstance) => {
  fastify.register(jwt, {
    secret: process.env.JWT_SECRET!,
    sign: { expiresIn: "7d" },
  });

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        reply.status(401).send({ error: "Unauthorized" });
      }
    }
  );
});

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}