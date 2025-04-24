import "dotenv/config";

import { Kafka } from "kafkajs";

import { fastify } from "fastify";
import { handler } from "./handler";

const kafka = new Kafka({
  clientId: "fraud-detection-service",
  brokers: ["localhost:9092"],
});

const topic = "transaction-created";

const consumer = kafka.consumer({
  groupId: `fraud-detection-consumer-${topic}`,
});

await consumer.connect();
await consumer.subscribe({
  topics: [topic],
});

const producer = kafka.producer();
await producer.connect();

await consumer.run({
  eachBatchAutoResolve: true,
  autoCommitInterval: 5000,
  autoCommitThreshold: 1000,
  eachBatch: handler(producer),
});

const app = fastify({
  logger: true,
});

app.get("/ping", (_, res) => {
  res.code(200);
});

app.listen({ port: 3008 }, (err, addr) => {
  if (err) {
    app.log.error(err);

    consumer.disconnect();

    process.exit(1);
  }

  console.log(`Server listening at ${addr}`);
});
