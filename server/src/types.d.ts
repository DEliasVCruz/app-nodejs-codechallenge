import { NodePgDatabase } from "drizzle-orm/node-postgres";

declare module "fastify" {
  interface FastifyInstance {
    pgdb: NodePgDatabase;
  }
}
