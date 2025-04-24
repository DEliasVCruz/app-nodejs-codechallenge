import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

type PgPluginOptions = {
  databaseUrl: string;
};

export const pgDatabasePlugin = fp(
  async (fastify: FastifyInstance, options: PgPluginOptions) => {
    const pool = new Pool({
      connectionString: options.databaseUrl,
    });

    const database = drizzle({ client: pool });

    fastify.decorate("pgdb", database);
  },
);
