import fp from "fastify-plugin";
import kafaRpcClient from "@/broker/rpc";

import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";

import { Kafka } from "kafkajs";

type KafkaPluginOptions = {
  clientId: string;
  brokers: Array<string>;
};

type kafkaRpcClientOptions = KafkaPluginOptions & {
  logger: Logger;
  timeOutMs: number;
  service: string;
};

import {
  accountCreateRpcResponse,
  ACCOUNTS_CREATE_RPC_DECORATOR,
  type AccountCreateRpcRequest,
  type AccountCreateRpcResponse,
} from "@accounts/schemas";

export const kafkaBrokerPlugin = fp(
  async (app: FastifyInstance, options: KafkaPluginOptions) => {
    const kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
    });

    app.decorate("kafka", kafka);
  },
);

export const kafkaAccountsCreateRpcCientPlugin = fp(
  async (app: FastifyInstance, options: kafkaRpcClientOptions) => {
    const kafka = new Kafka({
      clientId: options.clientId,
      brokers: options.brokers,
    });

    const rpc = await kafaRpcClient.create<
      AccountCreateRpcRequest,
      AccountCreateRpcResponse
    >(
      kafka,
      "accounts-create",
      options.service,
      options.timeOutMs,
      accountCreateRpcResponse,
      options.logger,
    );

    app.decorate(ACCOUNTS_CREATE_RPC_DECORATOR, rpc);
  },
);
