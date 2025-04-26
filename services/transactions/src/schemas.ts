import type { EachBatchHandler, Producer } from "kafkajs";

import { z, ZodIssueCode } from "zod";

import { type Client, TransferFlags } from "tigerbeetle-node";

import { handler as transferRequestHandler } from "@/handlers/transfer_request";
import { handler as transactionFraudValidationHandler } from "@/handlers/transaction_update";
import { handler as accountCreateHandler } from "@/handlers/account_create";

export const DEFAULT_TRANSCATION_EXPIRATION_TIME = 20; // time in seconds

const TRANSFER_FLAG_BY_TRANSACTION_STATUS: Record<
  TransactionStatus,
  TransferFlags
> = {
  pending: TransferFlags.pending,
  approved: TransferFlags.post_pending_transfer,
  rejected: TransferFlags.void_pending_transfer,
};

const ACCOUNT_STATUS = ["created", "pending", "declined"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUS)[number];

const TRANSACTION_STATUS = ["approved", "rejected", "pending"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUS)[number];

export const CONSUMER_TOPICS = [
  "transfer-request",
  "transaction-fraud-validation",
  "account-create",
] as const;

export type ConsumerTopics = (typeof CONSUMER_TOPICS)[number];

export const parseJsonPreprocessor = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (e as Error).message,
      });
    }
  }

  return value;
};

export const accountCreateMessage = z.object({
  account_id: z.string(),
  number: z.coerce.bigint().positive(),
  ledger: z.number().positive(),
  operation: z.number().positive(),
});

export type AccountCreatedMessage = {
  account_id: string;
  update_date: string;
  status: AccountStatus;
};

export type AccountCreateRequest = z.infer<typeof accountCreateMessage>;

export const transferRequestMessage = z.object({
  number: z.coerce.bigint().positive(),
  debit_account_id: z.coerce.bigint().positive(),
  credit_account_id: z.coerce.bigint().positive(),
  amount: z.coerce.bigint().positive(),
  code: z.number().positive(),
  ledger: z.number().positive(),
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
  (producer: Producer, tb: Client) => EachBatchHandler
> = {
  "transfer-request": transferRequestHandler,
  "transaction-fraud-validation": transactionFraudValidationHandler,
  "account-create": accountCreateHandler,
};

export const getConsumerHandler = (topic: ConsumerTopics) => {
  return TOPIC_CONSUMER_HANDLER_MAP[topic];
};

export const getTransferFlagByStatus = (
  status: TransactionStatus,
): TransferFlags => {
  return TRANSFER_FLAG_BY_TRANSACTION_STATUS[status];
};
