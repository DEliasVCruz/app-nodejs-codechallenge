import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { Kafka } from "kafkajs";

declare module "fastify" {
  interface FastifyInstance {
    pgdb: NodePgDatabase;
    kafka: Kafka;
  }
}
