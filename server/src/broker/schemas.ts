import type { EachBatchHandler } from "kafkajs";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";

import { z } from "zod";

import { handler as transactionUpdateHandler } from "@bk/handlers/transaction_updated";

import { TRANSACTION_STATUS } from "@transactions/schemas";

import { ACCOUNT_STATUS } from "@accounts/schemas";

export const CONSUMER_TOPICS = ["transaction-update"] as const;

export type ConsumerTopics = (typeof CONSUMER_TOPICS)[number];

export const accountCreatedMessage = z.object({
  account_number: z.string(),
  status: z.enum(ACCOUNT_STATUS),
});

export type AccountCreatedMessage = z.infer<typeof accountCreatedMessage>;

export const transferRequestMessage = z.object({
  number: z.coerce.bigint().positive(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.coerce.number().positive(),
  ledger: z.coerce.number().positive(),
});

export type TransferRequest = z.infer<typeof transferRequestMessage>;

export const transactionCreatedMessage = z
  .object({
    status: z.enum(TRANSACTION_STATUS),
    transaction_id: z.string(),
    creation_date: z.string(),
  })
  .merge(transferRequestMessage);

export type TransactionCreatedMessage = z.infer<
  typeof transactionCreatedMessage
>;

export const transactionUpdatedMessage = z
  .object({
    update_date: z.string(),
  })
  .merge(transactionCreatedMessage)
  .partial({
    amount: true,
    code: true,
    creation_date: true,
    ledger: true,
  });

export type TransactionUpdateMessage = z.infer<
  typeof transactionUpdatedMessage
>;

const TOPIC_CONSUMER_HANDLER_MAP: Record<
  ConsumerTopics,
  (producer: NodePgDatabase) => EachBatchHandler
> = {
  "transaction-update": transactionUpdateHandler,
};

export const getConsumerHandler = (topic: ConsumerTopics) => {
  return TOPIC_CONSUMER_HANDLER_MAP[topic];
};
