import "dotenv/config";

import { Kafka, type Consumer } from "kafkajs";

import { fastify } from "fastify";
// import { transferRequestMessage } from "./schemas";

const kafka = new Kafka({
  clientId: "transactions-service",
  brokers: ["localhost:9092"],
});

const topics = [
  "transfer-request",
  "transaction-fraud-validation",
  "account-creation-request",
];
const consumers: Array<Consumer> = [];

topics.forEach(async (topic) => {
  const consumer = kafka.consumer({
    groupId: `transactions-consumer-${topic}`,
  });
  consumers.push(consumer);

  await consumer.connect();
  await consumer.subscribe({
    topics: [topic],
  });

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      console.log("The topic", topic);
      if (message.value != null) {
        console.log("The message", message.value.toString());
      }
    },
  });
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

    consumers.forEach((consumer) => {
      consumer.disconnect();
    });

    process.exit(1);
  }

  console.log(`Server listening at ${addr}`);
});
