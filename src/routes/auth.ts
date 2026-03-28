import type { FastifyInstance } from "fastify";
import { db } from "../db/client";
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function authRoutes(fastify: FastifyInstance) {

  fastify.post(
    "/auth/register",
    {
      schema: {
        body: {
          type: "object",
          required: ["name", "email", "password"],
          properties: {
            name: { type: "string", minLength: 2 },
            email: { type: "string", format: "email" },
            password: { type: "string", minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const { name, email, password } = request.body as {
        name: string; email: string; password: string;
      };

      const hash = await bcrypt.hash(password, SALT_ROUNDS);

      try {
        const result = await db.query(
          "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email, color",
          [name, email, hash]
        );
        const user = result.rows[0];
        const token = fastify.jwt.sign({ id: user.id, email: user.email });
        return reply.status(201).send({ user, token });
      } catch (err: any) {
        if (err.code === "23505") {
          return reply.status(409).send({ error: "Email already registered" });
        }
        throw err;
      }
    }
  );

  fastify.post("/auth/login", async (request, reply) => {
    const { email, password } = request.body as {
      email: string; password: string;
    };

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    const user = result.rows[0];

    const passwordMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, "$2b$12$invalidhashfortimingattack");

    if (!user || !passwordMatch) {
      return reply.status(401).send({ error: "Invalid credentials" });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    const { password: _, ...safeUser } = user;  
    return { user: safeUser, token };
  });
}