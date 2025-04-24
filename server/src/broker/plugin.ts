import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

import { Kafka } from "kafkajs";

type KafkaPluginOptions = {
  clientId: string;
  brokers: Array<string>;
};

export const kafkaBrokerPlugin = fp(
  async (app: FastifyInstance, options: KafkaPluginOptions) => {
    const kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
    });

    console.log("We made it");

    app.decorate("kafka", kafka);

    console.log("About to connect to kafka");
    const consumer = kafka.consumer({ groupId: "api-consumer" });

    await consumer.connect();
    await consumer.subscribe({
      topics: ["account-created", "transfer-request"],
    });

    await consumer.run({
      eachMessage: async ({ topic, message }) => {
        console.log("The topic", topic);
        if (message.value != null) {
          console.log("The message", message.value.toString());
        }
      },
    });

    console.log("Have finished connections");
  },
);
