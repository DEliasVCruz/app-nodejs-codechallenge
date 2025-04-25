import "dotenv/config";

import { Kafka, type Consumer, type Producer } from "kafkajs";

import { fastify } from "fastify";
import { getConsumerHandler, CONSUMER_TOPICS } from "@/schemas";

import { createClient } from "tigerbeetle-node";

const kafka = new Kafka({
  clientId: "transactions-service",
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const tb = createClient({
  cluster_id: 0n,
  replica_addresses: [process.env.TB_ADDRESS || "3000"],
});

const consumers: Array<Consumer> = [];
const producers: Array<Producer> = [];

CONSUMER_TOPICS.forEach(async (topic) => {
  const consumer = kafka.consumer({
    groupId: `transactions-consumer-${topic}`,
  });
  consumers.push(consumer);

  await consumer.connect();
  await consumer.subscribe({
    topics: [topic],
  });

  const producer = kafka.producer();
  await producer.connect();

  producers.push(producer);

  const handler = getConsumerHandler(topic);

  await consumer.run({
    eachBatchAutoResolve: true,
    eachBatch: handler(producer, tb),
  });
});

const app = fastify({
  logger: true,
});

app.get("/ping", (_, res) => {
  res.code(200);
});

app.listen(
  {
    port: parseInt(process.env.PORT || "3002"),
    host: "0.0.0.0",
  },
  (err, addr) => {
    if (err) {
      app.log.error(err);
      consumers.forEach((consumer) => consumer.disconnect());
      process.exit(1);
    }
    app.log.info(`Transactions service listening on ${addr}`);
  },
);
