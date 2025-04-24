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

    app.decorate("kafka", kafka);
  },
);
