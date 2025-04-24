import type { EachBatchHandler, Producer } from "kafkajs";

import { z } from "zod";

import { handler as transferRequestHandler } from "@/handlers/transfer_request";
import { handler as transactionFraudValidationHandler } from "@/handlers/transaction_update";

const TRANSACTION_STATUS = ["approved", "rejected", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const CONSUMER_TOPICS = [
  "transfer-request",
  "transaction-fraud-validation",
] as const;

export type ConsumerTopics = (typeof CONSUMER_TOPICS)[number];

export const transferRequestMessage = z.object({
  number: z.coerce.bigint().positive(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.coerce.number().positive(),
  ledger: z.coerce.number().positive(),
});

export type TransferRequest = z.infer<typeof transferRequestMessage>;

export type TransferCreatedMessage =
  | Partial<TransferRequest>
  | {
      number: string;
      transaction_id: string;
      debit_account_id: string;
      credit_account_id: string;
      amount: string;
      creation_date: string;
      scale: number;
      status: TransactionStatus;
    };

export const fraudTransactionVeridictMessage = z
  .object({
    status: z.enum(TRANSACTION_STATUS),
    transaction_id: z.string(),
  })
  .merge(transferRequestMessage);

export type FraudTransactionVeridictEvent = z.infer<
  typeof fraudTransactionVeridictMessage
>;

export const trasferUpdateMessage = z
  .object({
    update_date: z.string(),
    scale: z.coerce.number().positive(),
  })
  .merge(fraudTransactionVeridictMessage);

export type TransferUpdate = z.infer<typeof trasferUpdateMessage>;

export type TransferUpdateMessage =
  | Partial<TransferUpdate>
  | {
      number: string;
      debit_account_id: string;
      credit_account_id: string;
    };

const TOPIC_CONSUMER_HANDLER_MAP: Record<
  ConsumerTopics,
  (producer: Producer) => EachBatchHandler
> = {
  "transfer-request": transferRequestHandler,
  "transaction-fraud-validation": transactionFraudValidationHandler,
};

export const getConsumerHandler = (topic: ConsumerTopics) => {
  return TOPIC_CONSUMER_HANDLER_MAP[topic];
};
