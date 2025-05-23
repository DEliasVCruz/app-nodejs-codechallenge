import "dotenv/config";

import { fastify, type FastifyPluginCallback } from "fastify";
import { pgDatabasePlugin } from "@db/plugin";
import {
  kafkaBrokerPlugin,
  kafkaAccountsCreateRpcClientPlugin,
  kafkaTransactionsCreateRpcClientPlugin,
} from "@/broker/plugin";

import { Kafka, type Consumer } from "kafkajs";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import auth, { type FastifyAuthFunction } from "@fastify/auth";
import bearerAuthPlugin from "@fastify/bearer-auth";

import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";

import { router as accountsRouter } from "@accounts/endpoints/router";
import { router as transactionsRouter } from "@transactions/endpoints/router";

import { buildDatabaseURL } from "@/utils";

import type { UserModel } from "@users/schemas";

import { CONSUMER_TOPICS, getConsumerHandler } from "@bk/schemas";

import pino from "pino";

const service = "api-server";
const logger = pino({ name: service });

logger.info("service_setup_initiated");

const dbURL = buildDatabaseURL();
const app = fastify({
  logger: true,
});

app.register(pgDatabasePlugin, { databaseUrl: dbURL });
app.register(kafkaBrokerPlugin, {
  clientId: service,
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});
app.register(kafkaAccountsCreateRpcClientPlugin, {
  clientId: service,
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
  service,
  timeOutMs: 2_000,
  logger: logger,
});
app.register(kafkaTransactionsCreateRpcClientPlugin, {
  clientId: service,
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
  service,
  timeOutMs: 2_000,
  logger: logger,
});

logger.info("http_plugins_registered");

// Add schema validator and serializer
app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.decorateRequest("user", null);

app
  .register(auth)
  .register(bearerAuthPlugin, {
    addHook: false,
    keys: new Set([]),
    auth: (key, req) => {
      const adminKey = process.env.ADMIN_KEY ?? "";
      if (!adminKey) {
        return false;
      }

      if (key != adminKey) {
        return false;
      }

      req.setDecorator<UserModel>("user", {
        name: "User Admin 1",
        id: process.env.ADMIN_USER_ID ?? "",
        role: "admin",
      });

      return true;
    },
    verifyErrorLogLevel: "debug",
  })
  .after(() => {
    const verifyBearerAuth =
      app.getDecorator<FastifyAuthFunction>("verifyBearerAuth");

    app.addHook("preHandler", app.auth([verifyBearerAuth]));
  });

logger.info("auth_pre_handlers_setup_succeeded");

const routes = [
  accountsRouter,
  transactionsRouter,
] as any as FastifyPluginCallback[];

routes.forEach((route) => {
  app.register(route, { prefix: "/api" });
});

logger.info("http_routes_registered");

const kafka = new Kafka({
  clientId: service,
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const consumers: Array<Consumer> = [];

const pool = new Pool({
  connectionString: dbURL,
});

const db = drizzle({ client: pool });

CONSUMER_TOPICS.forEach(async (topic) => {
  const consumer = kafka.consumer({
    groupId: `${service}-consumer-${topic}`,
  });
  consumers.push(consumer);

  await consumer.connect();
  await consumer.subscribe({
    topics: [topic],
  });

  const handler = getConsumerHandler(topic);

  await consumer.run({
    eachBatchAutoResolve: true,
    eachBatch: handler(db),
  });
});

app.listen(
  {
    port: parseInt(process.env.PORT || "3000"),
    host: "0.0.0.0",
  },
  (err, addr) => {
    if (err) {
      app.log.error(err);

      consumers.forEach((consumer) => {
        consumer.disconnect();
      });

      process.exit(1);
    }
    app.log.info(`Server listening on ${addr}`);
  },
);
