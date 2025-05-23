import "dotenv/config";

import { Kafka } from "kafkajs";

import { fastify } from "fastify";
import { handler } from "./handler";

const kafka = new Kafka({
  clientId: "fraud-detection-service",
  brokers: [process.env.KAFKA_BROKERS || "localhost:9092"],
});

const topic = "transaction-validate";

const consumer = kafka.consumer({
  groupId: `fraud-detection-consumer-${topic}`,
});

await consumer.connect();
await consumer.subscribe({
  topics: [topic],
});

const producer = kafka.producer();
await producer.connect();

await consumer
  .run({
    eachBatchAutoResolve: true,
    eachBatch: handler(producer),
  })
  .catch((e) =>
    console.error(`[run/transaction-verify/consumer] ${e.message}`, e),
  );

const app = fastify({
  logger: true,
});

app.get("/ping", (_, res) => {
  res.code(200);
});

app.listen(
  {
    port: parseInt(process.env.PORT || "3001"),
    host: "0.0.0.0",
  },
  (err, addr) => {
    if (err) {
      app.log.error(err);
      consumer.disconnect();
      process.exit(1);
    }
    app.log.info(`Anti-fraud service listening on ${addr}`);
  },
);
