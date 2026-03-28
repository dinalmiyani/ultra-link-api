import type { FastifyInstance } from "fastify";
import { db } from "../db/client";
import { cacheAside } from "../cache/client";

export async function eventRoutes(fastify: FastifyInstance) {

  fastify.get(
    "/events",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const { page = 1, limit = 50, name } = request.query as {
        page?: number; limit?: number; name?: string;
      };

      const offset = (page - 1) * Math.min(limit, 100);
      const cacheKey = `events:${name ?? "all"}:${page}:${limit}`;

      return cacheAside(cacheKey, 30, async () => {
        const whereClause = name ? "WHERE name = $3" : "";
        const params: any[] = [Math.min(limit, 100), offset];
        if (name) params.push(name);

        const [rows, count] = await Promise.all([
          db.query(
            `SELECT * FROM events ${whereClause}
             ORDER BY timestamp DESC LIMIT $1 OFFSET $2`,
            params
          ),
          db.query(
            `SELECT COUNT(*) FROM events ${whereClause}`,
            name ? [name] : []
          ),
        ]);

        return {
          data: rows.rows,
          total: parseInt(count.rows[0].count),
          page,
          totalPages: Math.ceil(parseInt(count.rows[0].count) / limit),
        };
      });
    }
  );
}