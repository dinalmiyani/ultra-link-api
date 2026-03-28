import type { FastifyInstance } from "fastify";
import { db } from "../db/client";
import { cacheAside, invalidateCache } from "../cache/client";

const widgetSchema = {
  type: "object",
  properties: {
    title: { type: "string", minLength: 1, maxLength: 100 },
    type: { type: "string", enum: ["line", "bar", "metric", "table"] },
  },
};

export async function widgetRoutes(fastify: FastifyInstance) {

  fastify.get(
    "/widgets",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const userId = (request.user as any).id;

      const widgets = await cacheAside(
        `widgets:${userId}`,
        60,
        () =>
          db
            .query("SELECT * FROM widgets WHERE user_id = $1 ORDER BY created_at", [userId])
            .then((r) => r.rows)
      );

      return widgets;
    }
  );

  fastify.patch(
    "/widgets/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        body: {
          ...widgetSchema,
          required: [],
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const patch = request.body as { title?: string; type?: string };
      const userId = (request.user as any).id;

      const fields = Object.keys(patch);
      if (fields.length === 0) {
        return reply.status(400).send({ error: "No fields to update" });
      }

      const setClauses = fields.map((f, i) => `${f} = $${i + 1}`).join(", ");
      const values = [...Object.values(patch), id, userId];

      const result = await db.query(
        `UPDATE widgets SET ${setClauses}, updated_at = now()
         WHERE id = $${fields.length + 1} AND user_id = $${fields.length + 2}
         RETURNING *`,
        values
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ error: "Widget not found" });
      }

      await invalidateCache(`widgets:${userId}`);

      return result.rows[0];
    }
  );

  fastify.delete(
    "/widgets/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = (request.user as any).id;

      await db.query(
        "DELETE FROM widgets WHERE id = $1 AND user_id = $2",
        [id, userId]
      );

      await invalidateCache(`widgets:${userId}`);
      return reply.status(204).send();
    }
  );
}