import "dotenv/config";

import { Kafka } from "kafkajs";

import { fastify } from "fastify";
// import { transferRequestMessage } from "./schemas";

import { batchFraudDetectionHandler } from "./handler";

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

await consumer.run({
  eachBatchAutoResolve: true,
  eachBatch: batchFraudDetectionHandler,
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
