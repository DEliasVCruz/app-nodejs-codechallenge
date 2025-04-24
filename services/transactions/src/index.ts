import "dotenv/config";

import { Kafka } from "kafkajs";

import { fastify } from "fastify";
// import { transferRequestMessage } from "./schemas";

const kafka = new Kafka({
  clientId: "transactions-service",
  brokers: ["localhost:9092"],
});

const consumer = kafka.consumer({ groupId: "api-consumer" });

const consumer_topics = [
  "transfer-request",
  "transaction-security",
  "account-creation-request",
];

await consumer.connect();
await consumer.subscribe({
  topics: consumer_topics,
});

consumer_topics.forEach(async () => {
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

    consumer.disconnect();

    process.exit(1);
  }

  console.log(`Server listening at ${addr}`);
});
